/**
 * Social service: generation, publishing, and admin actions.
 * Failure-isolated: social bundle failures never break payments.
 */

import mongoose from 'mongoose';
import SocialPost from './socialPost.model.js';
import Issue from '../issues/issue.model.js';
import Authority from '../authorities/authority.model.js';
import AuditLog from '../tiers/auditLog.model.js';
import { getSetting } from '../wallet/wallet.service.js';
import { sanitizeIssueForContent } from './sanitize.js';
import { generateWithGemini } from './copywriter.js';
import * as templates from './templates.js';
import * as bufferPublisher from './publishers/buffer.publisher.js';
import * as telegramPublisher from './publishers/telegram.publisher.js';
import * as redditPublisher from './publishers/reddit.publisher.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiResponse.js';

const PLATFORMS = ['X', 'INSTAGRAM', 'FACEBOOK', 'REDDIT', 'WHATSAPP', 'TELEGRAM'];

const PLATFORM_SOURCE_MAP = {
  X: 'x',
  FACEBOOK: 'fb',
  INSTAGRAM: 'ig',
  REDDIT: 'rd',
  TELEGRAM: 'tg',
  WHATSAPP: 'wa',
};

function buildShareUrl(issueId, platform) {
  const baseUrl = env.publicShareBaseUrl || env.clientUrl;
  const source = PLATFORM_SOURCE_MAP[platform] || 'direct';
  return `${baseUrl}/i/${issueId}?s=${source}`;
}

function getImageUrl(issue) {
  if (issue.photos && issue.photos.length > 0) {
    // Cloudinary transform: square 1080x1080 JPEG, auto quality
    const originalUrl = issue.photos[0];
    if (originalUrl.includes('cloudinary.com')) {
      return originalUrl.replace('/upload/', '/upload/c_fill,w_1080,h_1080,f_jpg,q_auto/');
    }
    return originalUrl;
  }
  
  return env.defaultSocialImageUrl || '';
}

function generateContentForPlatform(platform, { issue, authority, shareUrl, tier }) {
  const sanitized = sanitizeIssueForContent(issue);
  
  switch (platform) {
    case 'X':
      return {
        captionEn: templates.generateX({ issue: sanitized, authority, shareUrl, tier, lang: 'en' }),
        captionHi: templates.generateX({ issue: sanitized, authority, shareUrl, tier, lang: 'hi' }),
      };
    case 'INSTAGRAM':
      return {
        captionEn: templates.generateInstagram({ issue: sanitized, authority, shareUrl, tier, lang: 'en' }),
        captionHi: templates.generateInstagram({ issue: sanitized, authority, shareUrl, tier, lang: 'hi' }),
      };
    case 'FACEBOOK':
      return {
        captionEn: templates.generateFacebook({ issue: sanitized, authority, shareUrl, tier, lang: 'en' }),
        captionHi: templates.generateFacebook({ issue: sanitized, authority, shareUrl, tier, lang: 'hi' }),
      };
    case 'REDDIT':
      const redditEn = templates.generateReddit({ issue: sanitized, authority, shareUrl, tier, lang: 'en' });
      const redditHi = templates.generateReddit({ issue: sanitized, authority, shareUrl, tier, lang: 'hi' });
      return {
        titleEn: redditEn.title,
        titleHi: redditHi.title,
        captionEn: redditEn.body,
        captionHi: redditHi.body,
      };
    case 'WHATSAPP':
      return {
        captionEn: templates.generateWhatsApp({ issue: sanitized, authority, shareUrl, tier, lang: 'en' }),
        captionHi: templates.generateWhatsApp({ issue: sanitized, authority, shareUrl, tier, lang: 'hi' }),
      };
    case 'TELEGRAM':
      return {
        captionEn: templates.generateTelegram({ issue: sanitized, authority, shareUrl, tier, lang: 'en' }),
        captionHi: templates.generateTelegram({ issue: sanitized, authority, shareUrl, tier, lang: 'hi' }),
      };
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Generate bundle for all 6 platforms (X, Instagram, Facebook, Reddit, WhatsApp, Telegram).
 * Tries Gemini first, falls back to templates on any failure.
 * Upserts with $setOnInsert for idempotency (20 concurrent calls → one row set).
 */
export async function generateBundle({ issueId, tier }) {
  const issue = await Issue.findById(issueId).lean();
  if (!issue) {
    throw new Error('Issue not found');
  }
  
  const authority = issue.authorityId
    ? await Authority.findById(issue.authorityId).lean()
    : null;
  
  const imageUrl = getImageUrl(issue);
  
  // Try Gemini first
  let generationSource = 'TEMPLATE';
  let geminiResult = null;
  
  if (env.geminiApiKey && env.geminiModel) {
    const shareUrl = buildShareUrl(issueId, 'X');
    geminiResult = await generateWithGemini({ issue, authority, shareUrl, tier });
    
    if (geminiResult.success) {
      generationSource = 'GEMINI';
      console.log(`[social] Generated tier ${tier} bundle with Gemini for issue ${issueId}`);
    } else {
      console.warn(`[social] Gemini failed for issue ${issueId}, falling back to templates:`, geminiResult.error);
    }
  }
  
  // Create posts for all platforms
  const posts = [];
  
  for (const platform of PLATFORMS) {
    const shareUrl = buildShareUrl(issueId, platform);
    const sourceCode = PLATFORM_SOURCE_MAP[platform] || 'direct';
    
    let content;
    if (generationSource === 'GEMINI' && geminiResult.posts[platform]) {
      const raw = geminiResult.posts[platform];
      content = {
        ...raw,
        captionEn: raw.captionEn.replace(/\?s=x\b/g, `?s=${sourceCode}`),
        captionHi: raw.captionHi.replace(/\?s=x\b/g, `?s=${sourceCode}`),
      };
    } else {
      content = generateContentForPlatform(platform, { issue, authority, shareUrl, tier });
    }
    
    const postData = {
      issueId,
      tier,
      platform,
      ...content,
      imageUrl,
      generationSource,
      status: 'GENERATED',
    };
    
    try {
      // Upsert with $setOnInsert for idempotency
      const result = await SocialPost.updateOne(
        { issueId, tier, platform },
        { $setOnInsert: postData },
        { upsert: true },
      );
      
      if (result.upsertedCount > 0) {
        posts.push(await SocialPost.findOne({ issueId, tier, platform }));
      } else {
        // Already exists
        posts.push(await SocialPost.findOne({ issueId, tier, platform }));
      }
    } catch (error) {
      console.error(`[social] Failed to create ${platform} post:`, error.message);
    }
  }
  
  // Log audit entry (keep top-level tier for TIER_CLAIMED only; store tier in meta)
  try {
    await AuditLog.create({
      action: 'SOCIAL_BUNDLE_GENERATED',
      issueId,
      meta: { tier, generationSource, platformCount: posts.length },
    });
  } catch (error) {
    console.error('[social] Failed to log audit:', error.message);
  }
  
  // Publishing happens in background (AUTO mode) or on demand (REVIEW mode)
  const socialPublishMode = await getSetting('socialPublishMode').catch(() => 'AUTO');
  
  const done = (async () => {
    if (socialPublishMode === 'AUTO') {
      for (const post of posts) {
        try {
          await publishPost(post._id);
        } catch (error) {
          console.error(`[social] Auto-publish failed for ${post.platform}:`, error.message);
        }
      }
    }
  })();
  
  return { posts, done };
}

function getPublisher(platform) {
  switch (platform) {
    case 'X':
    case 'FACEBOOK':
    case 'INSTAGRAM':
      return bufferPublisher;
    case 'TELEGRAM':
      return telegramPublisher;
    case 'REDDIT':
      return redditPublisher;
    case 'WHATSAPP':
      return null; // WhatsApp stays GENERATED (citizen-share only)
    default:
      return null;
  }
}

/**
 * Publish a single post. Atomic conditional update ensures concurrent retries → one send.
 * Missing credentials → SIMULATED (not FAILED).
 */
export async function publishPost(postId) {
  const post = await SocialPost.findById(postId);
  if (!post) {
    throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
  }

  if (post.status === 'TAKEN_DOWN') {
    throw new ApiError('Cannot publish a taken-down post', 409, 'POST_ALREADY_TAKEN_DOWN');
  }

  // WhatsApp has no official API
  if (post.platform === 'WHATSAPP') {
    return post; // Stays GENERATED
  }

  if (post.status === 'POSTED') {
    return post; // Idempotent
  }

  const publisher = getPublisher(post.platform);
  if (!publisher) {
    return post;
  }

  // Check if configured
  const isConfigured = typeof publisher.isConfigured === 'function'
    ? publisher.isConfigured(post.platform)
    : publisher.isConfigured();

  if (!isConfigured) {
    // Transition atomically to SIMULATED (not FAILED)
    const updated = await SocialPost.findOneAndUpdate(
      { _id: postId, status: { $in: ['GENERATED', 'SIMULATED', 'FAILED'] } },
      { $set: { status: 'SIMULATED', lastError: `${post.platform} not configured` } },
      { returnDocument: 'after' },
    );
    console.log(`[social] ${post.platform} not configured, marked SIMULATED`);
    return updated ?? SocialPost.findById(postId);
  }
  
  // Atomic conditional update: GENERATED|SIMULATED|FAILED → POSTING
  const winner = await SocialPost.findOneAndUpdate(
    { _id: postId, status: { $in: ['GENERATED', 'SIMULATED', 'FAILED'] } },
    { $set: { status: 'POSTING' } },
    { returnDocument: 'after' },
  );
  
  if (!winner) {
    // Already POSTING/POSTED/TAKEN_DOWN by another process
    return SocialPost.findById(postId);
  }
  
  try {
    const result = await publisher.publish(winner.toObject());
    
    // Success
    return SocialPost.findByIdAndUpdate(
      postId,
      {
        $set: {
          status: 'POSTED',
          externalId: result.externalId,
          externalUrl: result.externalUrl,
          lastError: '',
        },
      },
      { returnDocument: 'after' },
    );
    
  } catch (error) {
    // Redact secrets from lastError
    const sanitizedError = error.message
      ?.replace(env.bufferApiKey || '', '[KEY_REDACTED]')
      ?.replace(env.telegramBotToken || '', '[TOKEN_REDACTED]')
      ?.replace(env.uploadPostApiKey || '', '[KEY_REDACTED]')
      ?.replace(env.redditClientSecret || '', '[SECRET_REDACTED]')
      ?.replace(env.redditRefreshToken || '', '[TOKEN_REDACTED]')
      || 'Unknown error';
    
    return SocialPost.findByIdAndUpdate(
      postId,
      {
        $set: {
          status: 'FAILED',
          lastError: sanitizedError.slice(0, 500),
        },
      },
      { returnDocument: 'after' },
    );
  }
}

/**
 * Regenerate content (admin action).
 * Allowed for GENERATED/SIMULATED/FAILED; rejects POSTED/TAKEN_DOWN.
 */
export async function regeneratePost(postId, actorId) {
  const post = await SocialPost.findById(postId);
  if (!post) {
    throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
  }
  
  if (['POSTED', 'TAKEN_DOWN'].includes(post.status)) {
    throw new ApiError(
      'Cannot regenerate posted or taken-down posts',
      409,
      'POST_NOT_REGENERATABLE',
    );
  }
  
  const issue = await Issue.findById(post.issueId).lean();
  if (!issue) {
    throw new ApiError('Issue not found', 404, 'ISSUE_NOT_FOUND');
  }
  const authority = issue.authorityId
    ? await Authority.findById(issue.authorityId).lean()
    : null;

  const shareUrl = buildShareUrl(post.issueId, post.platform);
  
  // Try Gemini, fall back to template
  let generationSource = 'TEMPLATE';
  let content;
  
  if (env.geminiApiKey && env.geminiModel) {
    const geminiResult = await generateWithGemini({ issue, authority, shareUrl, tier: post.tier });
    if (geminiResult.success && geminiResult.posts[post.platform]) {
      generationSource = 'GEMINI';
      content = geminiResult.posts[post.platform];
    }
  }
  
  if (!content) {
    content = generateContentForPlatform(post.platform, {
      issue,
      authority,
      shareUrl,
      tier: post.tier,
    });
  }
  
  const updated = await SocialPost.findByIdAndUpdate(
    postId,
    {
      $set: {
        ...content,
        generationSource,
        status: 'GENERATED',
        externalId: null,
        externalUrl: null,
        lastError: '',
      },
    },
    { returnDocument: 'after' },
  );
  
  await AuditLog.create({
    action: 'SOCIAL_POST_REGENERATED',
    actorId,
    issueId: post.issueId,
    tier: post.tier,
    meta: { platform: post.platform, generationSource },
  });
  
  return updated;
}

/**
 * Takedown (admin action).
 * Marks TAKEN_DOWN, calls publisher.remove() best-effort.
 */
export async function takedownPost(postId, reason, actorId) {
  const post = await SocialPost.findById(postId);
  if (!post) {
    throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
  }
  
  const publisher = getPublisher(post.platform);
  
  // Best-effort remote removal
  if (publisher && post.status === 'POSTED') {
    try {
      await publisher.remove(post.toObject());
    } catch (error) {
      console.warn(`[social] Takedown remote removal failed for ${post.platform}:`, error.message);
    }
  }
  
  const updated = await SocialPost.findByIdAndUpdate(
    postId,
    {
      $set: {
        status: 'TAKEN_DOWN',
        takedownReason: reason,
      },
    },
    { returnDocument: 'after' },
  );
  
  await AuditLog.create({
    action: 'SOCIAL_POST_TAKEN_DOWN',
    actorId,
    issueId: post.issueId,
    tier: post.tier,
    meta: { platform: post.platform, reason },
  });
  
  return updated;
}

/**
 * Called inside rejection transaction.
 * Marks all posts for the issue as TAKEN_DOWN.
 */
export async function takedownIssuePosts(issueId, session) {
  await SocialPost.updateMany(
    { issueId, status: { $ne: 'TAKEN_DOWN' } },
    { $set: { status: 'TAKEN_DOWN', takedownReason: 'ISSUE_REJECTED' } },
    { session },
  );
}

/**
 * Best-effort remote removal after a rejection transaction commits.
 */
export async function removeIssuePostsRemote(issueId) {
  const posts = await SocialPost.find({
    issueId,
    status: 'TAKEN_DOWN',
    externalId: { $nin: [null, ''] },
  }).lean();
  for (const post of posts) {
    const publisher = getPublisher(post.platform);
    if (publisher) {
      try {
        await publisher.remove(post);
      } catch (error) {
        console.warn(`[social] Post-rejection removal failed for ${post.platform}:`, error.message);
      }
    }
  }
}

/**
 * Public API: get posts for an issue (non-TAKEN_DOWN only, tier ≥ 1).
 */
export async function getIssuePosts(issueId) {
  const issue = await Issue.findById(issueId).lean();
  if (!issue || issue.status === 'REJECTED') {
    throw new ApiError('Issue not found', 404, 'ISSUE_NOT_FOUND');
  }
  if (issue.tier === 0) {
    return { posts: [], reachBySource: {} };
  }

  const posts = await SocialPost.find({
    issueId,
    status: { $ne: 'TAKEN_DOWN' },
  })
    .sort({ tier: -1, platform: 1 })
    .select('platform tier status generationSource captionEn captionHi titleEn titleHi externalUrl shareClicks')
    .lean();

  return {
    posts,
    reachBySource: issue.reachBySource || {},
  };
}

/**
 * Public API: trending issues (tier ≥ 1, not REJECTED/CLOSED).
 * Sort: tier desc, total reach desc, supporterCount desc.
 */
export async function getTrending({ page = 1, limit = 20, category, city } = {}) {
  const filter = {
    tier: { $gte: 1 },
    status: { $nin: ['REJECTED', 'CLOSED'] },
  };

  if (category) filter.category = category;
  if (city) {
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter['location.city'] = new RegExp(escapedCity, 'i');
  }

  // Calculate total reach for sorting
  const aggregation = [
    { $match: filter },
    {
      $addFields: {
        totalReach: {
          $add: [
            { $ifNull: ['$reachBySource.x', 0] },
            { $ifNull: ['$reachBySource.fb', 0] },
            { $ifNull: ['$reachBySource.ig', 0] },
            { $ifNull: ['$reachBySource.rd', 0] },
            { $ifNull: ['$reachBySource.tg', 0] },
            { $ifNull: ['$reachBySource.wa', 0] },
            { $ifNull: ['$reachBySource.direct', 0] },
          ],
        },
      },
    },
    { $sort: { tier: -1, totalReach: -1, supporterCount: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ];

  const [issues, totalCount] = await Promise.all([
    Issue.aggregate(aggregation),
    Issue.countDocuments(filter),
  ]);

  return {
    issues,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
  };
}

/**
 * Admin API: list posts with filters.
 */
export async function listPosts({ page = 1, limit = 20, status, platform, issueId, tier } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (platform) filter.platform = platform;
  if (issueId) filter.issueId = new mongoose.Types.ObjectId(issueId);
  if (tier) filter.tier = tier;

  const [posts, total, socialPublishMode] = await Promise.all([
    SocialPost.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('issueId', 'title')
      .lean(),
    SocialPost.countDocuments(filter),
    getSetting('socialPublishMode').catch(() => 'AUTO'),
  ]);

  return {
    posts,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    socialPublishMode,
  };
}

/**
 * Public click tracking (IP rate-limited in controller).
 */
export async function incrementShareClick(postId) {
  const post = await SocialPost.findById(postId);
  if (!post) {
    throw new ApiError('Post not found', 404, 'POST_NOT_FOUND');
  }
  
  if (post.status === 'TAKEN_DOWN') {
    throw new ApiError('Post has been taken down', 410, 'POST_TAKEN_DOWN');
  }
  
  const updated = await SocialPost.findByIdAndUpdate(
    postId,
    { $inc: { shareClicks: 1 } },
    { returnDocument: 'after' },
  ).select('shareClicks');
  
  return { shareClicks: updated.shareClicks };
}

/**
 * Admin settings toggle.
 */
export async function updatePublishMode(mode, actorId) {
  if (!['AUTO', 'REVIEW'].includes(mode)) {
    throw new ApiError('Invalid publish mode', 400, 'VALIDATION_ERROR');
  }
  
  const Settings = mongoose.model('Settings');
  await Settings.updateOne(
    { key: 'socialPublishMode' },
    { $set: { value: mode } },
  );
  
  await AuditLog.create({
    action: 'SOCIAL_PUBLISH_MODE_CHANGED',
    actorId,
    meta: { mode },
  });
  
  return { socialPublishMode: mode };
}

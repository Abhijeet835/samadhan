import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

const { testEnv } = vi.hoisted(() => ({
  testEnv: {
    nodeEnv: 'test',
    port: 5000,
    mongoUri: '',
    clientUrl: 'http://localhost:5173',
    jwtSecret: 'test-secret',
    jwtExpiresIn: '7d',
    adminEmail: 'admin@samadhan.local',
    adminPassword: 'Admin@12345',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'Samadhan <test@samadhan.local>',
    dispatchOverrideTo: '',
    n8nWebhookUrl: '',
    n8nWebhookSecret: '',
    enableCron: false,
    publicShareBaseUrl: 'http://localhost:5000',
    defaultSocialImageUrl: '',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash-lite',
    bufferApiKey: '',
    bufferChannelX: '',
    bufferChannelFb: '',
    bufferChannelIg: '',
    bufferPostMode: 'shareNow',
    telegramBotToken: '',
    telegramChatId: '',
    redditSubreddit: '',
    uploadPostApiKey: '',
    uploadPostUser: '',
    redditClientId: '',
    redditClientSecret: '',
    redditRefreshToken: '',
    redditUserAgent: 'samadhan-prototype/1.0',
  },
}));
vi.mock('../../config/env.js', () => ({ env: testEnv, isProduction: false }));

import app from '../../app.js';
import User from '../users/user.model.js';
import Issue from '../issues/issue.model.js';
import Authority from '../authorities/authority.model.js';
import SocialPost from './socialPost.model.js';
import Settings from '../wallet/settings.model.js';
import { ensureDefaultSettings, ensureWallet } from '../wallet/wallet.service.js';
import { createIssue, transitionIssue } from '../issues/issue.service.js';
import { createTokenPayload, generateAccessToken } from '../../utils/jwt.util.js';
import {
  generateBundle,
  getTrending,
  incrementShareClick,
  publishPost,
  regeneratePost,
  takedownIssuePosts,
} from './social.service.js';

let replSet;

const makeUser = (overrides = {}) =>
  User.create({
    name: 'Test Citizen',
    email: `user${Date.now()}${Math.random().toString(36).slice(2)}@test.local`,
    password: 'Password@123',
    phone: `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`,
    role: 'CITIZEN',
    ...overrides,
  });

const makeIssue = async (reporter, overrides = {}) =>
  Issue.create({
    title: 'Broken streetlight near MG Road bus stop',
    description: 'Streetlight pole 14 has been non-functional for two weeks leaving commuters in the dark.',
    category: 'ROAD',
    location: {
      type: 'Point',
      coordinates: [77.5946 + (Math.random() - 0.5) * 0.2, 12.9716 + (Math.random() - 0.5) * 0.2],
      address: 'MG Road, near Bus Stop',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    },
    reporterId: reporter._id,
    tier: 0,
    status: 'ACTIVE',
    photos: ['https://res.cloudinary.com/test/image/upload/v1/test.jpg'],
    fundPaise: 500,
    supporterCount: 1,
    ...overrides,
  });

const tokenFor = (user) => generateAccessToken(createTokenPayload(user));

function resetTestEnv() {
  testEnv.geminiApiKey = '';
  testEnv.bufferApiKey = '';
  testEnv.bufferChannelX = '';
  testEnv.bufferChannelFb = '';
  testEnv.bufferChannelIg = '';
  testEnv.telegramBotToken = '';
  testEnv.telegramChatId = '';
  testEnv.redditSubreddit = '';
  testEnv.uploadPostApiKey = '';
  testEnv.uploadPostUser = '';
  testEnv.redditClientId = '';
  testEnv.redditClientSecret = '';
  testEnv.redditRefreshToken = '';
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoose.connect(replSet.getUri());
  await ensureDefaultSettings();
  await Settings.updateOne({ key: 'socialPublishMode' }, { $set: { value: 'REVIEW' } }, { upsert: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});

beforeEach(async () => {
  resetTestEnv();
  await Promise.all([
    SocialPost.deleteMany(),
    Issue.deleteMany(),
    Authority.deleteMany(),
    User.deleteMany(),
  ]);
  await Settings.updateOne({ key: 'socialPublishMode' }, { $set: { value: 'REVIEW' } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('template fallback and bundle generation', () => {
  it('generates 6 valid bilingual posts with X <= 280 chars and authority handle', async () => {
    const reporter = await makeUser();
    const authority = await Authority.create({
      nameEn: 'BBMP Roads',
      nameHi: 'बीबीएमपी सड़क',
      department: 'Roads Department',
      categories: ['ROAD'],
      cityKeys: ['bengaluru'],
      email: 'roads@example.org',
      handles: { x: '@BBMPCOMM', facebook: 'BBMP', instagram: '@bbmp' },
    });
    const issue = await makeIssue(reporter, {
      category: 'ROAD',
      fundPaise: 20000,
      tier: 1,
      supporterCount: 12,
      authorityId: authority._id,
    });

    const result = await generateBundle({ issueId: issue._id, tier: 1 });
    await result.done;

    expect(result.posts).toHaveLength(6);
    expect(result.posts.map((p) => p.platform).sort()).toEqual([
      'FACEBOOK',
      'INSTAGRAM',
      'REDDIT',
      'TELEGRAM',
      'WHATSAPP',
      'X',
    ]);

    for (const post of result.posts) {
      expect(post.status).toBe('GENERATED');
      expect(post.generationSource).toBe('TEMPLATE');
      expect(post.captionEn.length).toBeGreaterThan(0);
      expect(post.captionHi).toMatch(/[\u0900-\u097F]/);
      expect(post.captionEn).not.toMatch(/₹|paise|rupee/i);
      expect(post.captionHi).not.toMatch(/₹|पैसे|रुपये/i);
      expect(post.tier).toBe(1);
    }

    const xPost = result.posts.find((p) => p.platform === 'X');
    expect(xPost.captionEn.length).toBeLessThanOrEqual(280);
    expect(xPost.captionHi.length).toBeLessThanOrEqual(280);
    expect(xPost.captionEn).toContain('@BBMPCOMM');
    expect(xPost.captionEn).toContain(`/i/${issue._id}?s=x`);

    const fbPost = result.posts.find((p) => p.platform === 'FACEBOOK');
    expect(fbPost.captionEn).toContain(`/i/${issue._id}?s=fb`);

    const igPost = result.posts.find((p) => p.platform === 'INSTAGRAM');
    expect(igPost.captionEn).toContain(`/i/${issue._id}?s=ig`);

    const redditPost = result.posts.find((p) => p.platform === 'REDDIT');
    expect(redditPost.titleEn).toBeTruthy();
    expect(redditPost.titleHi).toBeTruthy();
    expect(redditPost.captionEn).toContain(`/i/${issue._id}?s=rd`);
  });

  it('is idempotent even under 20 concurrent generateBundle calls', async () => {
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });

    const results = await Promise.all(
      Array.from({ length: 20 }, () => generateBundle({ issueId: issue._id, tier: 1 })),
    );
    await Promise.all(results.map((r) => r.done));

    const count = await SocialPost.countDocuments({ issueId: issue._id, tier: 1 });
    expect(count).toBe(6);
  });

  it('creates separate post sets for tier 1 and tier 2', async () => {
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 2 });

    await (await generateBundle({ issueId: issue._id, tier: 1 })).done;
    await (await generateBundle({ issueId: issue._id, tier: 2 })).done;

    const t1 = await SocialPost.find({ issueId: issue._id, tier: 1 });
    const t2 = await SocialPost.find({ issueId: issue._id, tier: 2 });
    expect(t1).toHaveLength(6);
    expect(t2).toHaveLength(6);
    expect(t1.find((p) => p.platform === 'X').captionEn).not.toBe(
      t2.find((p) => p.platform === 'X').captionEn,
    );
  });
});

describe('copywriter Gemini integration and sanitization', () => {
  it('strips user-injected URLs, mentions, hashtags, and control chars before templating', async () => {
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, {
      title: 'Broken road https://evil.example @badactor #spam\u0000bad',
      tier: 1,
    });

    const { posts, done } = await generateBundle({ issueId: issue._id, tier: 1 });
    await done;

    for (const post of posts) {
      expect(post.captionEn).not.toContain('evil.example');
      expect(post.captionEn).not.toContain('@badactor');
      expect(post.captionEn).not.toContain('#spam');
      expect(post.captionEn).not.toContain('\u0000');
    }
  });

  it('uses Gemini output when valid and rewrites per-platform tracking query', async () => {
    testEnv.geminiApiKey = 'fake-gemini-key';
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });
    const shareUrl = `http://localhost:5000/i/${issue._id}?s=x`;

    const geminiJson = {
      X: { captionEn: `Civic road alert in Bengaluru ${shareUrl}`, captionHi: `बेंगलुरु सड़क अलर्ट ${shareUrl}` },
      INSTAGRAM: { captionEn: `Road issue Bengaluru. Not official. ${shareUrl}`, captionHi: `सड़क समस्या बेंगलुरु। ${shareUrl}` },
      FACEBOOK: { captionEn: `Road issue Bengaluru. Not an official portal. ${shareUrl}`, captionHi: `सड़क समस्या बेंगलुरु। ${shareUrl}` },
      REDDIT: { titleEn: 'Road issue in Bengaluru', titleHi: 'बेंगलुरु सड़क समस्या', captionEn: `Details ${shareUrl}`, captionHi: `विवरण ${shareUrl}` },
      WHATSAPP: { captionEn: `Share road issue ${shareUrl}`, captionHi: `साझा करें ${shareUrl}` },
      TELEGRAM: { captionEn: `Alert road issue ${shareUrl}`, captionHi: `सूचना ${shareUrl}` },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(geminiJson) }] } }],
      }),
    });

    const { posts, done } = await generateBundle({ issueId: issue._id, tier: 1 });
    await done;

    expect(posts).toHaveLength(6);
    expect(posts[0].generationSource).toBe('GEMINI');
    expect(posts.find((p) => p.platform === 'FACEBOOK').captionEn).toContain('?s=fb');
    expect(posts.find((p) => p.platform === 'TELEGRAM').captionHi).toContain('?s=tg');
  });

  it('falls back to templates when Gemini leaks money or fails', async () => {
    testEnv.geminiApiKey = 'fake-gemini-key';
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });
    const shareUrl = `http://localhost:5000/i/${issue._id}?s=x`;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    X: { captionEn: `Paid ₹500 for this ${shareUrl}`, captionHi: `₹500 ${shareUrl}` },
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const { posts, done } = await generateBundle({ issueId: issue._id, tier: 1 });
    await done;

    expect(posts).toHaveLength(6);
    expect(posts[0].generationSource).toBe('TEMPLATE');
  });
});

describe('publish mode, publishers, and atomic state transitions', () => {
  it('REVIEW mode keeps all posts GENERATED', async () => {
    await Settings.updateOne({ key: 'socialPublishMode' }, { $set: { value: 'REVIEW' } });
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });

    const { done } = await generateBundle({ issueId: issue._id, tier: 1 });
    await done;

    const posts = await SocialPost.find({ issueId: issue._id });
    for (const post of posts) {
      expect(post.status).toBe('GENERATED');
    }
  });

  it('AUTO mode marks unconfigured platforms SIMULATED while WhatsApp stays GENERATED', async () => {
    await Settings.updateOne({ key: 'socialPublishMode' }, { $set: { value: 'AUTO' } });
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });

    const { done } = await generateBundle({ issueId: issue._id, tier: 1 });
    await done;

    const posts = await SocialPost.find({ issueId: issue._id });
    const whatsapp = posts.find((p) => p.platform === 'WHATSAPP');
    expect(whatsapp.status).toBe('GENERATED');

    for (const post of posts.filter((p) => p.platform !== 'WHATSAPP')) {
      expect(post.status).toBe('SIMULATED');
    }
  });

  it('Telegram publisher sends once even under concurrent publishPost calls', async () => {
    testEnv.telegramBotToken = 'secret-bot-token';
    testEnv.telegramChatId = '@samadhan_test';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 25));
      return {
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 987 } }),
      };
    });

    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });
    const { posts, done } = await generateBundle({ issueId: issue._id, tier: 1 });
    await done;

    const tgPost = posts.find((p) => p.platform === 'TELEGRAM');
    const [res1, res2] = await Promise.all([publishPost(tgPost._id), publishPost(tgPost._id)]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const updated = await SocialPost.findById(tgPost._id);
    expect(updated.status).toBe('POSTED');
    expect(updated.externalId).toBe('987');
    expect(updated.externalUrl).toBe('https://t.me/samadhan_test/987');
    expect([res1.status, res2.status]).toContain('POSTED');
  });

  it('redacts secrets in lastError if publisher fails and blocks publishing TAKEN_DOWN posts', async () => {
    testEnv.telegramBotToken = 'super-secret-token-123';
    testEnv.telegramChatId = '@samadhan_test';

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('Request to https://api.telegram.org/botsuper-secret-token-123/sendPhoto failed'),
    );

    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });
    const { posts, done } = await generateBundle({ issueId: issue._id, tier: 1 });
    await done;

    const tgPost = posts.find((p) => p.platform === 'TELEGRAM');
    const failed = await publishPost(tgPost._id);
    expect(failed.status).toBe('FAILED');
    expect(failed.lastError).not.toContain('super-secret-token-123');
    expect(failed.lastError).toContain('[TOKEN_REDACTED]');

    // Taking down prevents any future publish even when credentials are missing
    resetTestEnv();
    await SocialPost.updateOne({ _id: tgPost._id }, { $set: { status: 'TAKEN_DOWN' } });
    await expect(publishPost(tgPost._id)).rejects.toMatchObject({
      code: 'POST_ALREADY_TAKEN_DOWN',
      statusCode: 409,
    });
  });
});

describe('regenerate and rejection takedown', () => {
  it('regeneratePost resets SIMULATED/FAILED post to GENERATED and blocks POSTED/TAKEN_DOWN', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });
    const { posts, done } = await generateBundle({ issueId: issue._id, tier: 1 });
    await done;

    const xPost = posts.find((p) => p.platform === 'X');
    await publishPost(xPost._id); // -> SIMULATED
    const regenerated = await regeneratePost(xPost._id, admin._id);
    expect(regenerated.status).toBe('GENERATED');
    expect(regenerated.externalId).toBeNull();

    await SocialPost.updateOne({ _id: xPost._id }, { $set: { status: 'POSTED' } });
    await expect(regeneratePost(xPost._id, admin._id)).rejects.toMatchObject({
      code: 'POST_NOT_REGENERATABLE',
      statusCode: 409,
    });
  });

  it('rejecting an issue atomically takes down its social posts and refunds contributions', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const reporter = await makeUser();
    await ensureWallet(reporter._id);

    const { issue } = await createIssue({
      reporterId: reporter._id,
      data: {
        title: 'Overflowing drain near central market',
        description: 'Drainage water has flooded the entire footpath for three days continuously.',
        category: 'SEWAGE',
        location: { coordinates: [77.5946, 12.9716], address: 'Central Market', city: 'Bengaluru' },
        idempotencyKey: `rep:${Date.now()}`,
      },
    });
    await Issue.updateOne({ _id: issue._id }, { $set: { tier: 1, tiersReached: [1] } });
    await (await generateBundle({ issueId: issue._id, tier: 1 })).done;

    const rejected = await transitionIssue(
      issue._id,
      'REJECTED',
      { userId: admin._id, role: 'ADMIN' },
      'Spam test',
    );
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.fundPaise).toBe(0);

    const posts = await SocialPost.find({ issueId: issue._id });
    expect(posts).toHaveLength(6);
    for (const post of posts) {
      expect(post.status).toBe('TAKEN_DOWN');
      expect(post.takedownReason).toBe('ISSUE_REJECTED');
    }
  });

  it('takedownIssuePosts is idempotent inside a transaction', async () => {
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });
    await (await generateBundle({ issueId: issue._id, tier: 1 })).done;

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await takedownIssuePosts(issue._id, session);
      await takedownIssuePosts(issue._id, session);
    });
    await session.endSession();

    const posts = await SocialPost.find({ issueId: issue._id });
    expect(posts.every((p) => p.status === 'TAKEN_DOWN')).toBe(true);
  });
});

describe('trending, click tracking, and OG share page', () => {
  it('returns only tier>=1 non-closed/non-rejected issues sorted by tier then reach', async () => {
    const reporter = await makeUser();
    const t0 = await makeIssue(reporter, { tier: 0, fundPaise: 500 });
    const t1Low = await makeIssue(reporter, { tier: 1, fundPaise: 20000, reachBySource: { x: 2 } });
    const t1High = await makeIssue(reporter, { tier: 1, fundPaise: 20000, reachBySource: { wa: 10 } });
    const t2 = await makeIssue(reporter, { tier: 2, fundPaise: 50000, reachBySource: { x: 1 } });
    await makeIssue(reporter, { tier: 1, status: 'REJECTED' });
    await makeIssue(reporter, { tier: 1, status: 'CLOSED' });

    const res = await request(app).get('/api/issues/trending?page=1&limit=10');
    expect(res.status).toBe(200);
    const ids = res.body.data.issues.map((i) => i._id);
    expect(ids).toEqual([t2._id.toString(), t1High._id.toString(), t1Low._id.toString()]);
    expect(ids).not.toContain(t0._id.toString());

    const byCity = await getTrending({ city: 'Bengaluru', category: 'ROAD' });
    expect(byCity.issues.length).toBe(3);
  });

  it('tracks clicks and exposes posts on GET /api/issues/:issueId/social', async () => {
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { tier: 1 });
    const { posts, done } = await generateBundle({ issueId: issue._id, tier: 1 });
    await done;

    const listRes = await request(app).get(`/api/issues/${issue._id}/social`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.posts).toHaveLength(6);

    const postId = posts[0]._id;
    const clickRes = await request(app).post(`/api/social/${postId}/click`);
    expect(clickRes.status).toBe(200);
    expect(clickRes.body.data.shareClicks).toBe(1);

    const nextClick = await incrementShareClick(postId);
    expect(nextClick.shareClicks).toBe(2);
  });

  it('GET /i/:id serves OG tags, counts real visitor reach, ignores crawlers, and hides REJECTED', async () => {
    const reporter = await makeUser();
    const issue = await makeIssue(reporter, { title: 'OG Broken Bridge', tier: 1 });

    // Crawler visit should NOT increment reach
    const botRes = await request(app)
      .get(`/i/${issue._id}?s=fb`)
      .set('User-Agent', 'facebookexternalhit/1.1');
    expect(botRes.status).toBe(200);
    expect(botRes.text).toContain('og:title');
    expect(botRes.text).toContain('OG Broken Bridge');

    let fresh = await Issue.findById(issue._id);
    expect(fresh.reachBySource.fb).toBe(0);

    // Real visitor DOES increment reach
    const userRes = await request(app)
      .get(`/i/${issue._id}?s=wa`)
      .set('User-Agent', 'Mozilla/5.0 (Linux; Android 13)');
    expect(userRes.status).toBe(200);

    fresh = await Issue.findById(issue._id);
    expect(fresh.reachBySource.wa).toBe(1);

    // Rejected or invalid ID returns 404 + noindex
    await Issue.updateOne({ _id: issue._id }, { $set: { status: 'REJECTED' } });
    const rejectedRes = await request(app).get(`/i/${issue._id}`);
    expect(rejectedRes.status).toBe(404);
    expect(rejectedRes.text).toContain('noindex');

    const badRes = await request(app).get('/i/not-an-id');
    expect(badRes.status).toBe(404);
    expect(badRes.text).toContain('noindex');
  });
});

describe('admin social endpoints and RBAC', () => {
  it('enforces admin role and supports list/publish/regenerate/takedown/settings', async () => {
    const admin = await makeUser({ role: 'ADMIN' });
    const citizen = await makeUser({ role: 'CITIZEN' });
    const adminToken = tokenFor(admin);
    const citizenToken = tokenFor(citizen);

    const unauth = await request(app).get('/api/admin/social');
    expect(unauth.status).toBe(401);

    const forbidden = await request(app)
      .get('/api/admin/social')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(forbidden.status).toBe(403);

    const issue = await makeIssue(citizen, { tier: 1 });
    await (await generateBundle({ issueId: issue._id, tier: 1 })).done;

    const listRes = await request(app)
      .get('/api/admin/social')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.posts).toHaveLength(6);
    expect(listRes.body.data.socialPublishMode).toBe('REVIEW');

    const post = listRes.body.data.posts.find((p) => p.platform === 'X');

    const pubRes = await request(app)
      .post(`/api/admin/social/${post._id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.post.status).toBe('SIMULATED');

    const regenRes = await request(app)
      .post(`/api/admin/social/${post._id}/regenerate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(regenRes.status).toBe(200);
    expect(regenRes.body.data.post.status).toBe('GENERATED');

    const tdRes = await request(app)
      .post(`/api/admin/social/${post._id}/takedown`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Inappropriate framing' });
    expect(tdRes.status).toBe(200);
    expect(tdRes.body.data.post.status).toBe('TAKEN_DOWN');

    const setRes = await request(app)
      .patch('/api/admin/social/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ socialPublishMode: 'AUTO' });
    expect(setRes.status).toBe(200);
    expect(setRes.body.data.socialPublishMode).toBe('AUTO');
  });
});

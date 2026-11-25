/**
 * Public OG (Open Graph) share page controller.
 * Login-free server-rendered HTML at GET /i/:id
 */

import mongoose from 'mongoose';
import Issue from '../issues/issue.model.js';
import SocialPost from './socialPost.model.js';
import { env } from '../../config/env.js';

const CRAWLER_UAS = [
  'whatsapp',
  'facebookexternalhit',
  'twitterbot',
  'telegrambot',
  'instagram',
  'redditbot',
  'googlebot',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'applebot',
];

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_UAS.some((crawler) => ua.includes(crawler));
}

export async function ogPage(req, res) {
  const { id } = req.params;
  const { s: source } = req.query ?? {};

  const notFoundHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>Issue Not Found - Samadhan</title>
</head>
<body>
  <h1>Issue Not Found</h1>
  <p>This issue does not exist or has been removed.</p>
</body>
</html>
  `;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).send(notFoundHtml);
  }

  try {
    const issue = await Issue.findById(id).lean();

    // Missing or REJECTED → neutral 404 with noindex
    if (!issue || issue.status === 'REJECTED') {
      return res.status(404).send(notFoundHtml);
    }
    
    // Track reach by source (ignore crawlers)
    const userAgent = req.get('user-agent') || '';
    if (!isCrawler(userAgent)) {
      const validSources = ['x', 'fb', 'ig', 'rd', 'tg', 'wa', 'direct'];
      const sourceKey = validSources.includes(source) ? source : 'direct';
      
      // Atomic increment
      await Issue.updateOne(
        { _id: id },
        { $inc: { [`reachBySource.${sourceKey}`]: 1 } },
      );
    }
    
    // Fetch official social posts (non-TAKEN_DOWN)
    const socialPosts = await SocialPost.find({
      issueId: id,
      status: { $nin: ['TAKEN_DOWN', 'FAILED'] },
    })
      .select('platform externalUrl')
      .lean();
    
    // Build OG meta tags
    const title = escapeHtml(issue.title);
    const description = escapeHtml(issue.description.slice(0, 200));
    const ogImage = issue.photos?.[0] || (env.defaultSocialImageUrl || '');
    const ogUrl = `${env.publicShareBaseUrl || env.clientUrl}/i/${id}`;
    
    const statusLabel = issue.status === 'ACTIVE' ? 'Active' : 
                        issue.status === 'RESOLVED' ? 'Resolved' : issue.status;
    const tierLabel = issue.tier === 1 ? 'Spotlight' : 
                      issue.tier === 2 ? 'Escalated' : '';
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}
  <meta property="og:url" content="${escapeHtml(ogUrl)}">
  <meta property="og:site_name" content="Samadhan">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}">` : ''}
  
  <title>${title} - Samadhan</title>
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .header {
      border-bottom: 2px solid #0EA5E9;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }
    .badge-status {
      background: #DBEAFE;
      color: #1E40AF;
    }
    .badge-tier {
      background: #FEF3C7;
      color: #92400E;
    }
    .photo {
      width: 100%;
      max-width: 600px;
      height: auto;
      border-radius: 8px;
      margin: 16px 0;
    }
    .info {
      background: #F8FAFC;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
    .cta {
      display: inline-block;
      background: #0EA5E9;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      margin: 16px 0;
      font-weight: 600;
    }
    .cta:hover {
      background: #0284C7;
    }
    .social-links {
      margin: 24px 0;
    }
    .social-links a {
      display: inline-block;
      margin-right: 12px;
      color: #0EA5E9;
      text-decoration: none;
    }
    .disclaimer {
      font-size: 12px;
      color: #64748B;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #E2E8F0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Samadhan</h1>
    <p>Community-driven civic issue platform</p>
  </div>
  
  <div>
    <span class="badge badge-status">${escapeHtml(statusLabel)}</span>
    ${tierLabel ? `<span class="badge badge-tier">${escapeHtml(tierLabel)}</span>` : ''}
  </div>
  
  <h2>${title}</h2>
  
  ${issue.photos?.[0] ? `<img src="${escapeHtml(issue.photos[0])}" alt="Issue photo" class="photo">` : ''}
  
  <p>${description}...</p>
  
  <div class="info">
    <strong>Category:</strong> ${escapeHtml(issue.category)}<br>
    <strong>Location:</strong> ${escapeHtml(issue.location?.city || issue.location?.address || 'Location not specified')}<br>
    <strong>Community Support:</strong> ${issue.supporterCount} ${issue.supporterCount === 1 ? 'person' : 'people'}
  </div>
  
  <a href="${escapeHtml(env.clientUrl)}/issues/${id}" class="cta">Open in Samadhan App</a>
  
  ${socialPosts.length > 0 ? `
    <div class="social-links">
      <h3>Official Samadhan Posts:</h3>
      ${socialPosts.filter(p => p.externalUrl).map(p => 
        `<a href="${escapeHtml(p.externalUrl)}" target="_blank">${escapeHtml(p.platform)}</a>`
      ).join(' ')}
    </div>
  ` : ''}
  
  <div class="disclaimer">
    <strong>Disclaimer:</strong> Samadhan is not an official government portal. 
    We transparently record and amplify public civic issues. 
    This platform never claims government authority or commands officials.
    <br><br>
    For emergencies, always call 112.
  </div>
</body>
</html>
    `;
    
    return res.status(200).send(html);
    
  } catch (error) {
    console.error('[og] Error generating OG page:', error);
    return res.status(500).send('Error loading page');
  }
}

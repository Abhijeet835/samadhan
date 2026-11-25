/**
 * Reddit publisher.
 * Supports either UPLOAD_POST API or native Reddit OAuth.
 * If neither configured → SIMULATED.
 */

import { env } from '../../../config/env.js';

export function isConfigured() {
  // Check UPLOAD_POST credentials
  if (env.uploadPostApiKey && env.uploadPostUser) {
    return true;
  }
  
  // Check Reddit OAuth credentials
  if (
    env.redditClientId &&
    env.redditClientSecret &&
    env.redditRefreshToken &&
    env.redditUserAgent
  ) {
    return true;
  }
  
  return false;
}

async function publishViaUploadPost(post) {
  if (!env.uploadPostApiKey || !env.uploadPostUser || !env.redditSubreddit) {
    throw new Error('UPLOAD_POST not fully configured');
  }
  
  const title = post.titleEn + ' / ' + post.titleHi;
  const body = post.captionEn + '\n\n---\n\n' + post.captionHi;
  
  const payload = {
    subreddit: env.redditSubreddit,
    title: title.slice(0, 300),
    body,
    username: env.uploadPostUser,
    ...(post.imageUrl && { image_url: post.imageUrl }),
  };
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  
  try {
    const response = await fetch('https://api.upload-post.com/v1/reddit/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.uploadPostApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timer);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`UPLOAD_POST error: ${errorData.message || response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.id || !data.url) {
      throw new Error('UPLOAD_POST returned no post ID or URL');
    }
    
    return {
      externalId: data.id,
      externalUrl: data.url,
    };
    
  } catch (error) {
    clearTimeout(timer);
    const sanitized = error.message?.replace(env.uploadPostApiKey || '', '[KEY_REDACTED]') || 'Unknown error';
    throw new Error(sanitized);
  }
}

async function getRedditAccessToken() {
  const auth = Buffer.from(`${env.redditClientId}:${env.redditClientSecret}`).toString('base64');
  
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': env.redditUserAgent,
    },
    body: `grant_type=refresh_token&refresh_token=${env.redditRefreshToken}`,
  });
  
  if (!response.ok) {
    throw new Error('Reddit OAuth failed');
  }
  
  const data = await response.json();
  return data.access_token;
}

async function publishViaRedditOAuth(post) {
  if (!env.redditSubreddit) {
    throw new Error('Reddit subreddit not configured');
  }
  
  const accessToken = await getRedditAccessToken();
  
  const title = post.titleEn + ' / ' + post.titleHi;
  const body = post.captionEn + '\n\n---\n\n' + post.captionHi;
  
  const kind = post.imageUrl ? 'link' : 'self';
  const payload = {
    sr: env.redditSubreddit,
    kind,
    title: title.slice(0, 300),
    ...(kind === 'self' ? { text: body } : { url: post.imageUrl }),
  };
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  
  try {
    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': env.redditUserAgent,
      },
      body: new URLSearchParams(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timer);
    
    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.json?.errors?.length) {
      throw new Error(`Reddit errors: ${JSON.stringify(data.json.errors)}`);
    }
    
    const postId = data.json?.data?.id;
    const postUrl = data.json?.data?.url;
    
    if (!postId) {
      throw new Error('Reddit returned no post ID');
    }
    
    return {
      externalId: postId,
      externalUrl: postUrl || '',
    };
    
  } catch (error) {
    clearTimeout(timer);
    const sanitized = error.message
      ?.replace(env.redditClientSecret || '', '[SECRET_REDACTED]')
      ?.replace(env.redditRefreshToken || '', '[TOKEN_REDACTED]')
      || 'Unknown error';
    throw new Error(sanitized);
  }
}

export async function publish(post) {
  if (!isConfigured()) {
    throw new Error('Reddit not configured');
  }
  
  // Try UPLOAD_POST first if configured
  if (env.uploadPostApiKey && env.uploadPostUser) {
    return publishViaUploadPost(post);
  }
  
  // Fall back to native Reddit OAuth
  return publishViaRedditOAuth(post);
}

export async function remove(post) {
  // Best effort or no-op
  return { removed: false, reason: 'Reddit post removal not implemented' };
}

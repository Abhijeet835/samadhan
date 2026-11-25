/**
 * Buffer publisher for X, Facebook, and Instagram.
 * Uses Buffer's GraphQL API with ONE adapter.
 */

import { env } from '../../../config/env.js';

const PLATFORM_CHANNEL_MAP = {
  X: env.bufferChannelX,
  FACEBOOK: env.bufferChannelFb,
  INSTAGRAM: env.bufferChannelIg,
};

export function isConfigured(platform) {
  return !!(env.bufferApiKey && PLATFORM_CHANNEL_MAP[platform]);
}

/**
 * Publish to Buffer via GraphQL API.
 * Returns { externalId, externalUrl } on success.
 * Throws on failure.
 */
export async function publish(post) {
  if (!isConfigured(post.platform)) {
    throw new Error(`Buffer not configured for ${post.platform}`);
  }
  
  const channelId = PLATFORM_CHANNEL_MAP[post.platform];
  const caption = post.captionEn + '\n\n' + post.captionHi;
  
  // Instagram requires images
  const assets = post.imageUrl ? [{ source: post.imageUrl }] : [];
  if (post.platform === 'INSTAGRAM' && !post.imageUrl) {
    throw new Error('Instagram posts require an image');
  }
  
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;
  
  const variables = {
    input: {
      text: caption,
      channelId,
      schedulingType: 'automatic',
      mode: env.bufferPostMode || 'shareNow',
      ...(assets.length && { assets }),
    },
  };
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  
  try {
    const response = await fetch('https://api.buffer.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.bufferApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation, variables }),
      signal: controller.signal,
    });
    
    clearTimeout(timer);
    
    if (!response.ok) {
      throw new Error(`Buffer API responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for top-level GraphQL errors
    if (data.errors && data.errors.length > 0) {
      const errorMsg = data.errors.map((e) => e.message).join('; ');
      throw new Error(`Buffer GraphQL error: ${errorMsg}`);
    }
    
    // Check for MutationError in the response
    const result = data.data?.createPost;
    if (!result) {
      throw new Error('Buffer returned no createPost result');
    }
    
    if (result.message) {
      // This is a MutationError
      throw new Error(`Buffer mutation error: ${result.message}`);
    }
    
    if (!result.post?.id) {
      throw new Error('Buffer returned no post ID');
    }
    
    return {
      externalId: result.post.id,
      externalUrl: '', // Buffer doesn't provide direct URLs via API
    };
    
  } catch (error) {
    clearTimeout(timer);
    // Redact API key from error messages
    const sanitized = error.message?.replace(env.bufferApiKey || '', '[KEY_REDACTED]') || 'Unknown error';
    throw new Error(sanitized);
  }
}

/**
 * Buffer cannot delete live posts on X/FB/IG.
 * This is a no-op; takedown marks TAKEN_DOWN in our DB only.
 */
export async function remove(post) {
  // No-op: Buffer API doesn't support deletion of published posts
  return { removed: false, reason: 'Buffer does not support post deletion' };
}

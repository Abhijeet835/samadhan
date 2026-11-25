/**
 * Telegram publisher using Bot API.
 * sendPhoto when imageUrl exists and caption ≤ 1024, else sendMessage.
 */

import { env } from '../../../config/env.js';

export function isConfigured() {
  return !!(env.telegramBotToken && env.telegramChatId);
}

function buildTelegramUrl(method) {
  return `https://api.telegram.org/bot${env.telegramBotToken}/${method}`;
}

export async function publish(post) {
  if (!isConfigured()) {
    throw new Error('Telegram not configured');
  }
  
  const caption = post.captionEn + '\n\n' + post.captionHi;
  
  // Use sendPhoto if image exists and caption ≤ 1024, else sendMessage
  const usePhoto = post.imageUrl && caption.length <= 1024;
  
  const method = usePhoto ? 'sendPhoto' : 'sendMessage';
  const body = {
    chat_id: env.telegramChatId,
    parse_mode: 'HTML',
    ...(usePhoto
      ? { photo: post.imageUrl, caption }
      : { text: caption }),
  };
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  
  try {
    const response = await fetch(buildTelegramUrl(method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timer);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Telegram API error: ${errorData.description || response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.ok || !data.result) {
      throw new Error('Telegram returned no result');
    }
    
    const messageId = data.result.message_id;
    
    // Build external URL if chat ID is a public channel (@username)
    let externalUrl = '';
    if (env.telegramChatId.startsWith('@')) {
      const channelUsername = env.telegramChatId.slice(1);
      externalUrl = `https://t.me/${channelUsername}/${messageId}`;
    }
    
    return {
      externalId: String(messageId),
      externalUrl,
    };
    
  } catch (error) {
    clearTimeout(timer);
    // Redact bot token from error messages
    const sanitized = error.message?.replace(env.telegramBotToken || '', '[TOKEN_REDACTED]') || 'Unknown error';
    throw new Error(sanitized);
  }
}

export async function remove(post) {
  if (!isConfigured() || !post.externalId) {
    return { removed: false, reason: 'Not configured or no message ID' };
  }
  
  try {
    const response = await fetch(buildTelegramUrl('deleteMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.telegramChatId,
        message_id: Number(post.externalId),
      }),
    });
    
    if (!response.ok) {
      return { removed: false, reason: 'Telegram delete failed' };
    }
    
    const data = await response.json();
    return { removed: data.ok === true, reason: data.ok ? '' : 'API returned false' };
    
  } catch (error) {
    return { removed: false, reason: error.message };
  }
}

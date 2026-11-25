/**
 * Gemini AI drafting layer with server-side validation.
 * Native fetch, zero extra SDKs, 10s timeout.
 * Graceful fallback to templates on any failure.
 */

import { env } from '../../config/env.js';

const PLATFORM_LIMITS = {
  X: 280,
  INSTAGRAM: 2200,
  FACEBOOK: 2200,
  REDDIT_TITLE: 300,
  REDDIT_BODY: 10000,
  WHATSAPP: 2000,
  TELEGRAM: 1000,
};

// Patterns to detect leaked sensitive content
const MONEY_PATTERN = /₹|rupee|paise|rs\.?\s*\d+/i;
const EMAIL_PATTERN = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
const PHONE_PATTERN = /\b\d{10}\b/;
const PII_PATTERNS = [EMAIL_PATTERN, PHONE_PATTERN];

function sanitizeOutput(text) {
  if (!text) return '';
  
  // Strip any leaked money/PII patterns
  let clean = text
    .replace(MONEY_PATTERN, '')
    .replace(EMAIL_PATTERN, '[email redacted]')
    .replace(PHONE_PATTERN, '[phone redacted]')
    .trim();
  
  return clean;
}

function validatePlatformContent(platform, content) {
  const { captionEn, captionHi, titleEn, titleHi } = content;
  
  // Verify required fields exist
  if (!captionEn || !captionHi) {
    return { valid: false, reason: 'Missing captions' };
  }
  
  // Check for leaked sensitive patterns
  for (const pattern of [MONEY_PATTERN, ...PII_PATTERNS]) {
    if (pattern.test(captionEn) || pattern.test(captionHi)) {
      return { valid: false, reason: 'Contains sensitive content' };
    }
    if (platform === 'REDDIT' && (pattern.test(titleEn || '') || pattern.test(titleHi || ''))) {
      return { valid: false, reason: 'Reddit title contains sensitive content' };
    }
  }
  
  // Verify URL presence (must have shareUrl)
  const urlPattern = /https?:\/\/[^\s]+/;
  if (!urlPattern.test(captionEn) || !urlPattern.test(captionHi)) {
    return { valid: false, reason: 'Missing share URL' };
  }
  
  // Enforce hard code-point length limits
  switch (platform) {
    case 'X':
      if (captionEn.length > PLATFORM_LIMITS.X || captionHi.length > PLATFORM_LIMITS.X) {
        return { valid: false, reason: 'X caption exceeds 280 chars' };
      }
      break;
    case 'INSTAGRAM':
      if (captionEn.length > PLATFORM_LIMITS.INSTAGRAM || captionHi.length > PLATFORM_LIMITS.INSTAGRAM) {
        return { valid: false, reason: 'Instagram caption exceeds 2200 chars' };
      }
      break;
    case 'REDDIT':
      if (!titleEn || !titleHi) {
        return { valid: false, reason: 'Reddit requires titles' };
      }
      if (titleEn.length > PLATFORM_LIMITS.REDDIT_TITLE || titleHi.length > PLATFORM_LIMITS.REDDIT_TITLE) {
        return { valid: false, reason: 'Reddit title exceeds 300 chars' };
      }
      break;
  }
  
  return { valid: true };
}

function truncateForPlatform(platform, content) {
  const { captionEn, captionHi, titleEn, titleHi } = content;
  
  // For X, never truncate URL — truncate text instead
  if (platform === 'X') {
    const truncateX = (text) => {
      if (text.length <= PLATFORM_LIMITS.X) return text;
      
      // Extract URL
      const urlMatch = text.match(/https?:\/\/[^\s]+$/);
      if (!urlMatch) return text.slice(0, PLATFORM_LIMITS.X);
      
      const url = urlMatch[0];
      const textPart = text.slice(0, -url.length).trim();
      const maxText = PLATFORM_LIMITS.X - url.length - 1; // -1 for space
      
      if (textPart.length <= maxText) return text;
      return textPart.slice(0, maxText - 3).trim() + '... ' + url;
    };
    
    return {
      captionEn: truncateX(captionEn),
      captionHi: truncateX(captionHi),
    };
  }
  
  // Other platforms: simple truncation
  return {
    captionEn: captionEn.slice(0, PLATFORM_LIMITS[platform] || 2200),
    captionHi: captionHi.slice(0, PLATFORM_LIMITS[platform] || 2200),
    titleEn: titleEn?.slice(0, PLATFORM_LIMITS.REDDIT_TITLE),
    titleHi: titleHi?.slice(0, PLATFORM_LIMITS.REDDIT_TITLE),
  };
}

/**
 * Call Gemini API to generate bilingual content for all 6 platforms in ONE call.
 * Returns { success: true, posts: { platform: { captionEn, captionHi, titleEn?, titleHi? } } }
 * or { success: false, error: string }
 */
export async function generateWithGemini({ issue, authority, shareUrl, tier }) {
  if (!env.geminiApiKey || !env.geminiModel) {
    return { success: false, error: 'Gemini not configured' };
  }
  
  const systemInstruction = `You are a civic engagement copywriter for Samadhan, a community platform (NOT an official government portal). Generate FACTS-ONLY bilingual social media content (English and Hindi) based on the provided civic issue JSON.

STRICT RULES:
- Use ONLY facts from the supplied JSON (title, description, category, location, supporter count)
- NO money amounts (no ₹, rupees, paise, Rs.)
- NO reporter name or personal information
- NO individual officer names
- NO accusatory language
- Include the matched authority handle or "the concerned department"
- Add hashtags: #Samadhan + city + category (max 5)
- MUST include the exact platform public URL in every caption
- Include a short "not an official government portal" disclaimer on Facebook/Reddit/WhatsApp/Telegram
- X: ≤280 chars INCLUDING the full URL (truncate text, never URL)
- Instagram: ≤2200 chars
- Reddit: title ≤300 chars

TIER CONTEXT:
- Tier 1 = Spotlight campaign (factual alert, community attention)
- Tier 2 = Formal Escalation (stronger, action request, but still factual)

Generate for ALL 6 platforms: X, Instagram, Facebook, Reddit, WhatsApp, Telegram.

Respond in JSON format ONLY.`;

  const payload = {
    contents: [{
      parts: [{
        text: JSON.stringify({
          issue: {
            title: issue.title,
            description: issue.description,
            category: issue.category,
            location: issue.location?.city || issue.location?.address || 'location',
            supporterCount: issue.supporterCount,
          },
          authority: authority ? {
            nameEn: authority.nameEn,
            nameHi: authority.nameHi,
            handles: authority.handles,
          } : null,
          shareUrl,
          tier,
        }),
      }],
    }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          X: {
            type: 'object',
            properties: {
              captionEn: { type: 'string' },
              captionHi: { type: 'string' },
            },
          },
          INSTAGRAM: {
            type: 'object',
            properties: {
              captionEn: { type: 'string' },
              captionHi: { type: 'string' },
            },
          },
          FACEBOOK: {
            type: 'object',
            properties: {
              captionEn: { type: 'string' },
              captionHi: { type: 'string' },
            },
          },
          REDDIT: {
            type: 'object',
            properties: {
              titleEn: { type: 'string' },
              titleHi: { type: 'string' },
              captionEn: { type: 'string' },
              captionHi: { type: 'string' },
            },
          },
          WHATSAPP: {
            type: 'object',
            properties: {
              captionEn: { type: 'string' },
              captionHi: { type: 'string' },
            },
          },
          TELEGRAM: {
            type: 'object',
            properties: {
              captionEn: { type: 'string' },
              captionHi: { type: 'string' },
            },
          },
        },
      },
    },
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  };
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timer);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn('[copywriter] Gemini API error:', response.status, errorText.slice(0, 200));
      return { success: false, error: `Gemini API error: ${response.status}` };
    }
    
    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.warn('[copywriter] Gemini returned no content');
      return { success: false, error: 'No content in Gemini response' };
    }
    
    const generatedText = data.candidates[0].content.parts[0].text;
    const posts = JSON.parse(generatedText);
    
    // Server-side validation AFTER Gemini responds
    const validated = {};
    let allValid = true;
    
    for (const platform of ['X', 'INSTAGRAM', 'FACEBOOK', 'REDDIT', 'WHATSAPP', 'TELEGRAM']) {
      let content = posts[platform];
      
      if (!content || !content.captionEn || !content.captionHi) {
        console.warn(`[copywriter] Gemini missing ${platform} content`);
        allValid = false;
        continue;
      }
      
      // Sanitize output (strip money/PII patterns)
      content = {
        captionEn: sanitizeOutput(content.captionEn),
        captionHi: sanitizeOutput(content.captionHi),
        titleEn: content.titleEn ? sanitizeOutput(content.titleEn) : undefined,
        titleHi: content.titleHi ? sanitizeOutput(content.titleHi) : undefined,
      };
      
      // Validate
      const validation = validatePlatformContent(platform, content);
      if (!validation.valid) {
        console.warn(`[copywriter] Gemini validation failed for ${platform}:`, validation.reason);
        allValid = false;
        continue;
      }
      
      // Truncate if needed (especially X)
      validated[platform] = truncateForPlatform(platform, content);
    }
    
    if (!allValid || Object.keys(validated).length !== 6) {
      console.warn('[copywriter] Gemini validation failed, falling back to templates');
      return { success: false, error: 'Gemini output failed validation' };
    }
    
    return { success: true, posts: validated };
    
  } catch (error) {
    clearTimeout(timer);
    
    // Redact API key from error messages
    const sanitizedError = error.message?.replace(env.geminiApiKey || '', '[KEY_REDACTED]') || 'Unknown error';
    console.warn('[copywriter] Gemini call failed:', sanitizedError);
    
    return { success: false, error: sanitizedError };
  }
}

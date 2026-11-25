/**
 * SANITISE user title/description BEFORE passing to templates OR Gemini.
 * Removes URLs, @mentions, #hashtags, control chars; collapses whitespace.
 */

const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
const MENTION_PATTERN = /@\w+/g;
const HASHTAG_PATTERN = /#\w+/g;
// Control characters except newlines/tabs
const CONTROL_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function sanitizeText(text, maxLength = 500) {
  if (!text) return '';
  
  let clean = String(text)
    .replace(URL_PATTERN, '')
    .replace(MENTION_PATTERN, '')
    .replace(HASHTAG_PATTERN, '')
    .replace(CONTROL_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength).trim();
  }
  
  return clean;
}

export function sanitizeIssueForContent(issue) {
  return {
    ...issue,
    title: sanitizeText(issue.title, 150),
    description: sanitizeText(issue.description, 500),
  };
}

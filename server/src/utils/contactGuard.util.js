import { ApiError } from './apiResponse.js';

// Refuse phone-like digit runs and URLs in free text. Normalise first so
// obfuscated numbers (Devanagari/Arabic-Indic digits, zero-width chars) cannot
// slip through. Shared by helpers and admin authority-reply (Phase 8B).
const CONTACT_PATTERNS = [
  /(?:\+?91[\s-]?)?[6-9](?:[\s-]?\d){9}/,
  /\d(?:[\s-]?\d){9,}/,
  /https?:\/\//i,
  /\bwww\./i,
];

function normaliseForContactCheck(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function assertNoContactInfo(fields) {
  for (const value of Object.values(fields)) {
    if (typeof value !== 'string') continue;
    const normalised = normaliseForContactCheck(value);
    if (CONTACT_PATTERNS.some((re) => re.test(normalised))) {
      throw new ApiError(
        'Phone numbers and links are not allowed in profile text — use the dedicated phone field.',
        400,
        'CONTACT_IN_TEXT',
      );
    }
  }
}

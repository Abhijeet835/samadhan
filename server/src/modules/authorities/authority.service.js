import Authority from './authority.model.js';
import { ApiError } from '../../utils/apiResponse.js';

/** trim → lowercase → strip diacritics → collapse spaces. */
export function normaliseCity(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export async function listAuthorities() {
  return Authority.find().sort({ isFallback: 1, nameEn: 1 }).lean();
}

export async function createAuthority(data) {
  const authority = await Authority.create({
    ...data,
    cityKeys: data.cityKeys.map(normaliseCity),
  });
  return authority.toObject();
}

export async function updateAuthority(id, data) {
  const patch = { ...data };
  if (patch.cityKeys) patch.cityKeys = patch.cityKeys.map(normaliseCity);
  const authority = await Authority.findByIdAndUpdate(id, { $set: patch }, { returnDocument: 'after' });
  if (!authority) {
    throw new ApiError('Authority not found.', 404, 'AUTHORITY_NOT_FOUND');
  }
  return authority.toObject();
}

/**
 * EXACT match priority (isActive only):
 * 1) same city + exact category  2) same city + '*'
 * 3) fallback + exact category  4) fallback + '*'  5) null.
 * Never throws — callers handle null explicitly.
 */
export async function matchAuthority(issue) {
  const cityKey = normaliseCity(issue?.location?.city);
  const category = issue?.category;
  const active = await Authority.find({ isActive: true }).lean();

  const cityMatch = (a) => cityKey && a.cityKeys.includes(cityKey);
  const catMatch = (a) => a.categories.includes(category);
  const wildcard = (a) => a.categories.includes('*');

  return (
    active.find((a) => !a.isFallback && cityMatch(a) && catMatch(a)) ??
    active.find((a) => !a.isFallback && cityMatch(a) && wildcard(a)) ??
    active.find((a) => a.isFallback && catMatch(a)) ??
    active.find((a) => a.isFallback && wildcard(a)) ??
    null
  );
}

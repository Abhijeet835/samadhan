// Local Mode: verified real-world service providers ONLY (NO retail stores, bakeries, or medical → 112).

export const LOCAL_CATEGORIES = [
  'CAB_AUTO',
  'PLUMBER_ELECTRICIAN',
  'APPLIANCE_REPAIR',
  'GARAGE_MECHANIC',
  'HOUSE_CLEANING',
  'CARPENTER',
  'PAINTER',
  'PACKERS_MOVERS',
  'OTHER_LOCAL',
];

export const LEGACY_LOCAL_CATEGORY_MAP = Object.freeze({
  CAB_DRIVER: 'CAB_AUTO',
  PLUMBER: 'PLUMBER_ELECTRICIAN',
  ELECTRICIAN: 'PLUMBER_ELECTRICIAN',
  LOCKSMITH: 'CARPENTER',
  GENERAL_STORE: 'OTHER_LOCAL',
  GROCERY_DELIVERY: 'OTHER_LOCAL',
  SWEETS_BAKERY: 'OTHER_LOCAL',
});

export const ALL_ACCEPTED_LOCAL_CATEGORIES = [
  ...LOCAL_CATEGORIES,
  ...Object.keys(LEGACY_LOCAL_CATEGORY_MAP),
];

export function normalizeLocalCategory(category) {
  if (!category) return category;
  const upper = String(category).trim().toUpperCase();
  return LEGACY_LOCAL_CATEGORY_MAP[upper] ?? upper;
}

export const SEARCH_RADII_KM = [2, 5, 10, 25];
export const DAILY_CONNECT_LIMIT = 10;
export const CONNECT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
export const AUTO_HIDE_FLAG_THRESHOLD = 3;

// Changing any of these on a VERIFIED provider resets verification to PENDING.
export const REVERIFY_FIELDS = ['phone', 'categories', 'serviceLocation', 'displayName'];

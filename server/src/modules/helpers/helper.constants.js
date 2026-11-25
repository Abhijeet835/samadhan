// Local Mode: verified local service marketplace (NO Medical Help — emergencies → 112).

export const LOCAL_CATEGORIES = [
  'CAB_AUTO',
  'GENERAL_STORE',
  'GARAGE_MECHANIC',
  'SWEETS_BAKERY',
  'PLUMBER_ELECTRICIAN',
  'APPLIANCE_REPAIR',
  'OTHER_LOCAL',
];

export const LEGACY_LOCAL_CATEGORY_MAP = Object.freeze({
  CAB_DRIVER: 'CAB_AUTO',
  GROCERY_DELIVERY: 'GENERAL_STORE',
  PLUMBER: 'PLUMBER_ELECTRICIAN',
  ELECTRICIAN: 'PLUMBER_ELECTRICIAN',
  HOUSE_CLEANING: 'OTHER_LOCAL',
  LOCKSMITH: 'OTHER_LOCAL',
  CARPENTER: 'OTHER_LOCAL',
  PAINTER: 'OTHER_LOCAL',
  PACKERS_MOVERS: 'OTHER_LOCAL',
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

// Local Mode: FREE hyperlocal directory of admin-verified helpers.
// NO wallet fees. Medical Help is intentionally excluded — emergencies → 112.
// Cab/Auto is a phone directory only (no ride booking or fares).

export const LOCAL_CATEGORIES = [
  'PLUMBER',
  'ELECTRICIAN',
  'CAB_DRIVER',
  'HOUSE_CLEANING',
  'LOCKSMITH',
  'CARPENTER',
  'PAINTER',
  'PACKERS_MOVERS',
  'GROCERY_DELIVERY',
];

export const SEARCH_RADII_KM = [2, 5, 10];
export const DAILY_CONNECT_LIMIT = 10;
export const CONNECT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'];
export const AUTO_HIDE_FLAG_THRESHOLD = 3;

// Changing any of these on a VERIFIED helper resets verification to PENDING.
export const REVERIFY_FIELDS = ['phone', 'categories', 'serviceLocation', 'displayName'];

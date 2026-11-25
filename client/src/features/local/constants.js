import { CakeSlice, Car, Cpu, MoreHorizontal, ShoppingBag, Wrench, CarFront } from 'lucide-react';

export const LOCAL_CATEGORIES = [
  'CAB_AUTO',
  'GENERAL_STORE',
  'GARAGE_MECHANIC',
  'SWEETS_BAKERY',
  'PLUMBER_ELECTRICIAN',
  'APPLIANCE_REPAIR',
  'OTHER_LOCAL',
];

export const LEGACY_LOCAL_CATEGORY_MAP = {
  CAB_DRIVER: 'CAB_AUTO',
  GROCERY_DELIVERY: 'GENERAL_STORE',
  PLUMBER: 'PLUMBER_ELECTRICIAN',
  ELECTRICIAN: 'PLUMBER_ELECTRICIAN',
  HOUSE_CLEANING: 'OTHER_LOCAL',
  LOCKSMITH: 'OTHER_LOCAL',
  CARPENTER: 'OTHER_LOCAL',
  PAINTER: 'OTHER_LOCAL',
  PACKERS_MOVERS: 'OTHER_LOCAL',
};

export function normalizeLocalCat(cat) {
  return LEGACY_LOCAL_CATEGORY_MAP[cat] ?? cat ?? 'OTHER_LOCAL';
}

export const CATEGORY_ICONS = {
  CAB_AUTO: Car,
  GENERAL_STORE: ShoppingBag,
  GARAGE_MECHANIC: CarFront,
  SWEETS_BAKERY: CakeSlice,
  PLUMBER_ELECTRICIAN: Wrench,
  APPLIANCE_REPAIR: Cpu,
  OTHER_LOCAL: MoreHorizontal,
};

export const SEARCH_RADII = [2, 5, 10, 25];

const LOCATION_KEY = 'samadhan_local_location';

export function loadLocalLocation() {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalLocation(location) {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
}

export function clearLocalLocation() {
  localStorage.removeItem(LOCATION_KEY);
}

export const MODE_KEY = 'samadhan_mode';

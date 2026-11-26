import { Car, CarFront, Cpu, Hammer, MoreHorizontal, Paintbrush, Sparkles, Truck, Wrench } from 'lucide-react';

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

export const LEGACY_LOCAL_CATEGORY_MAP = {
  CAB_DRIVER: 'CAB_AUTO',
  PLUMBER: 'PLUMBER_ELECTRICIAN',
  ELECTRICIAN: 'PLUMBER_ELECTRICIAN',
  LOCKSMITH: 'CARPENTER',
  GENERAL_STORE: 'OTHER_LOCAL',
  GROCERY_DELIVERY: 'OTHER_LOCAL',
  SWEETS_BAKERY: 'OTHER_LOCAL',
};

export function normalizeLocalCat(cat) {
  return LEGACY_LOCAL_CATEGORY_MAP[cat] ?? cat ?? 'OTHER_LOCAL';
}

export const CATEGORY_ICONS = {
  CAB_AUTO: Car,
  PLUMBER_ELECTRICIAN: Wrench,
  APPLIANCE_REPAIR: Cpu,
  GARAGE_MECHANIC: CarFront,
  HOUSE_CLEANING: Sparkles,
  CARPENTER: Hammer,
  PAINTER: Paintbrush,
  PACKERS_MOVERS: Truck,
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

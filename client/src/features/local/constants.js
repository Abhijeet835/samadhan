import { Car, Droplets, Hammer, KeyRound, Leaf, Package, Paintbrush, ShoppingBasket, Sparkles, Zap } from 'lucide-react';

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

export const CATEGORY_ICONS = {
  PLUMBER: Droplets,
  ELECTRICIAN: Zap,
  CAB_DRIVER: Car,
  HOUSE_CLEANING: Sparkles,
  LOCKSMITH: KeyRound,
  CARPENTER: Hammer,
  PAINTER: Paintbrush,
  PACKERS_MOVERS: Package,
  GROCERY_DELIVERY: ShoppingBasket,
};

export const SEARCH_RADII = [2, 5, 10];

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

export const MODE_KEY = 'samadhan_mode';

import { describe, expect, it } from 'vitest';

import { CATEGORY_ICONS, LOCAL_CATEGORIES, normalizeLocalCat } from './constants';

describe('Local service-only categories', () => {
  it('excludes retail general stores and sweets/bakery shops', () => {
    expect(LOCAL_CATEGORIES).not.toContain('GENERAL_STORE');
    expect(LOCAL_CATEGORIES).not.toContain('SWEETS_BAKERY');
    expect(LOCAL_CATEGORIES).toEqual([
      'CAB_AUTO',
      'PLUMBER_ELECTRICIAN',
      'APPLIANCE_REPAIR',
      'GARAGE_MECHANIC',
      'HOUSE_CLEANING',
      'CARPENTER',
      'PAINTER',
      'PACKERS_MOVERS',
      'OTHER_LOCAL',
    ]);
    for (const cat of LOCAL_CATEGORIES) {
      expect(CATEGORY_ICONS[cat]).toBeTruthy();
    }
  });

  it('normalizes legacy categories safely', () => {
    expect(normalizeLocalCat('PLUMBER')).toBe('PLUMBER_ELECTRICIAN');
    expect(normalizeLocalCat('LOCKSMITH')).toBe('CARPENTER');
    expect(normalizeLocalCat('GENERAL_STORE')).toBe('OTHER_LOCAL');
    expect(normalizeLocalCat('SWEETS_BAKERY')).toBe('OTHER_LOCAL');
  });
});

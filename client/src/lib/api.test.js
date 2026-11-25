import { describe, expect, it } from 'vitest';
import { normalizeApiBaseUrl } from '@/lib/api';
import { normalizeIndianState } from '@/lib/indiaLocations';

describe('normalizeApiBaseUrl', () => {
  it('falls back to localhost/api when empty', () => {
    expect(normalizeApiBaseUrl('')).toBe('http://localhost:5000/api');
    expect(normalizeApiBaseUrl(undefined)).toBe('http://localhost:5000/api');
  });

  it('appends /api when omitted and strips trailing slashes', () => {
    expect(normalizeApiBaseUrl('https://samadhan-api.onrender.com')).toBe('https://samadhan-api.onrender.com/api');
    expect(normalizeApiBaseUrl('https://samadhan-api.onrender.com/')).toBe('https://samadhan-api.onrender.com/api');
    expect(normalizeApiBaseUrl('https://samadhan-api.onrender.com/api/')).toBe('https://samadhan-api.onrender.com/api');
    expect(normalizeApiBaseUrl('https://samadhan-api.onrender.com/api')).toBe('https://samadhan-api.onrender.com/api');
  });
});

describe('normalizeIndianState', () => {
  it('normalizes codes, aliases, and Hindi names to official English state names', () => {
    expect(normalizeIndianState('NCT of Delhi')).toBe('Delhi');
    expect(normalizeIndianState('Orissa')).toBe('Odisha');
    expect(normalizeIndianState('Pondicherry')).toBe('Puducherry');
    expect(normalizeIndianState('KA')).toBe('Karnataka');
    expect(normalizeIndianState('झारखंड')).toBe('Jharkhand');
    expect(normalizeIndianState('')).toBe('');
  });
});

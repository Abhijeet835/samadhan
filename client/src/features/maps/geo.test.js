import { describe, expect, it } from 'vitest';
import { toLatLng, toGeoJSON, roundCoord, bboxFromBounds, DEFAULT_CENTER } from '@/features/maps/geo';

describe('geo helpers', () => {
  it('converts GeoJSON [lng,lat] ↔ Leaflet [lat,lng]', () => {
    expect(toLatLng([77.5946, 12.9716])).toEqual([12.9716, 77.5946]);
    expect(toGeoJSON(12.9716, 77.5946)).toEqual([77.5946, 12.9716]);
    expect(toLatLng(toGeoJSON(12.97, 77.59))).toEqual([12.97, 77.59]);
  });
  it('rounds coordinates', () => {
    expect(roundCoord(77.59461234, 3)).toBe(77.595);
    expect(roundCoord(12.97165678, 5)).toBe(12.97166);
  });
  it('default centre is Bengaluru [lat,lng]', () => {
    expect(DEFAULT_CENTER).toEqual([12.9716, 77.5946]);
  });
  it('bboxFromBounds maps Leaflet bounds', () => {
    const bounds = { getWest: () => 77.5, getSouth: () => 12.9, getEast: () => 77.7, getNorth: () => 13.0 };
    expect(bboxFromBounds(bounds)).toEqual({ west: 77.5, south: 12.9, east: 77.7, north: 13.0 });
  });
});

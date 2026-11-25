// COORDINATE RULE: GeoJSON / MongoDB / our API use [lng, lat].
// Leaflet uses [lat, lng]. ALWAYS convert through these helpers — never pass
// raw API coordinates straight to Leaflet.

export const DEFAULT_CENTER = [12.9716, 77.5946]; // Bengaluru [lat, lng]

export const toLatLng = ([lng, lat]) => [lat, lng];
export const toGeoJSON = (lat, lng) => [lng, lat];
export const roundCoord = (n, dp = 5) => Number(Number(n).toFixed(dp));

export function bboxFromBounds(bounds) {
  // Leaflet Bounds → { west, south, east, north }
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  };
}

export function defaultCenter({ homeLocation, savedLocal } = {}) {
  const home = homeLocation?.coordinates;
  if (Array.isArray(home) && home.length === 2) return toLatLng(home);
  if (savedLocal && Number.isFinite(savedLocal.lat) && Number.isFinite(savedLocal.lng)) {
    return [savedLocal.lat, savedLocal.lng];
  }
  return DEFAULT_CENTER;
}

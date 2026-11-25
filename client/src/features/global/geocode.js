const NOMINATIM = 'https://nominatim.openstreetmap.org';

export async function reverseGeocode(lat, lng, lang = 'en') {
  const res = await fetch(
    `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=${lang}`,
  );
  if (!res.ok) throw new Error('reverse geocode failed');
  return res.json();
}

export async function forwardGeocode(query, lang = 'en') {
  const res = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=1&accept-language=${lang}&q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('geocode failed');
  const results = await res.json();
  return results.length ? results[0] : null;
}

export function parseAddressParts(result) {
  const a = result?.address || {};
  const street = [a.house_number, a.road || a.neighbourhood || a.suburb].filter(Boolean).join(', ');
  const fallback = (result?.display_name || '').split(',').slice(0, 2).join(', ');
  return {
    address: street || a.suburb || a.neighbourhood || fallback,
    city: a.city || a.town || a.village || a.municipality || a.county || '',
    state: a.state || '',
    pincode: /^\d{6}$/.test(a.postcode || '') ? a.postcode : '',
  };
}

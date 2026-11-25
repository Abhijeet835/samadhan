import { useCallback, useEffect, useRef, useState } from 'react';
import { Marker, Circle, useMapEvents } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import L from 'leaflet';

import MapShell from './MapShell';
import { defaultCenter, toLatLng } from './geo';
import { useGeolocation } from './useGeolocation';
import { forwardGeocode, reverseGeocode, parseAddressParts } from '@/features/global/geocode';
import { loadLocalLocation } from '@/features/local/constants';

const pinIcon = L.divIcon({
  html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0f766e;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4);"></div>',
  className: 'samadhan-pin',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

// Reverse-geocode cache (4dp) + min 1.1s between Nominatim calls (usage policy).
const geoCache = new Map();
let lastCall = 0;

function ClickToPlace({ onPlace }) {
  useMapEvents({ click: (e) => onPlace(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function LocationPicker({ value, onChange, radiusKm, height = 300 }) {
  const { t, i18n } = useTranslation();
  const { locate, locating } = useGeolocation();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const debounceRef = useRef(null);

  const lat = value?.lat;
  const lng = value?.lng;
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng);
  const center = hasPin ? [lat, lng] : defaultCenter({ savedLocal: loadLocalLocation() });

  const reverse = useCallback(async (la, ln) => {
    const key = `${la.toFixed(4)},${ln.toFixed(4)}`;
    if (geoCache.has(key)) {
      onChange({ ...geoCache.get(key), lat: la, lng: ln });
      return;
    }
    const wait = Math.max(0, 1100 - (Date.now() - lastCall));
    await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    try {
      const result = await reverseGeocode(la, ln, i18n.language);
      const parts = parseAddressParts(result);
      geoCache.set(key, parts);
      onChange({ ...parts, lat: la, lng: ln });
    } catch {
      onChange({ lat: la, lng: ln });
    }
  }, [onChange, i18n.language]);

  const place = useCallback((la, ln) => {
    setAccuracy(null);
    onChange({ lat: la, lng: ln });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reverse(la, ln), 800);
  }, [onChange, reverse]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  async function findOnMap() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await forwardGeocode(query.trim());
      if (result) place(Number(result.lat), Number(result.lon));
      else toast.error(t('report.geocodeFailed'));
    } catch {
      toast.error(t('report.geocodeFailed'));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" onClick={async () => { const p = await locate(); if (p) { setAccuracy(p.accuracy); place(p.lat, p.lng); } }} disabled={locating}
          className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800">
          {locating ? t('report.locating') : t('report.useMyLocation')}
        </button>
        <div className="flex flex-1 gap-1">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('maps.findOnMapPlaceholder')}
            className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), findOnMap())} />
          <button type="button" onClick={findOnMap} disabled={searching} className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white">
            {t('maps.findOnMap')}
          </button>
        </div>
      </div>

      <MapShell center={center} zoom={hasPin ? 15 : 12} height={height}>
        <ClickToPlace onPlace={place} />
        {hasPin && (
          <Marker
            position={[lat, lng]}
            icon={pinIcon}
            draggable
            eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); place(p.lat, p.lng); } }}
          />
        )}
        {hasPin && radiusKm ? <Circle center={[lat, lng]} radius={radiusKm * 1000} pathOptions={{ color: '#0f766e', fillOpacity: 0.08 }} /> : null}
        {hasPin && accuracy ? <Circle center={[lat, lng]} radius={accuracy} pathOptions={{ color: '#2563eb', fillOpacity: 0.1 }} /> : null}
      </MapShell>
      <p className="mt-1 text-[11px] text-slate-400">{t('maps.pickerHint')}</p>
    </div>
  );
}

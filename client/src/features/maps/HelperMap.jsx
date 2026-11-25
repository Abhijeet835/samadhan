import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Circle, Marker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

import api from '@/lib/api';
import MapShell from './MapShell';
import { toLatLng } from './geo';
import { helperPin, seekerIcon } from './pins';

const INDIA_CENTER = [22.5, 78.9];

function FitBounds({ center, radiusKm, hasGeo }) {
  const map = useMap();
  useEffect(() => {
    if (hasGeo) {
      map.fitBounds(L_circleBounds(center, radiusKm));
    } else {
      map.setView(INDIA_CENTER, 5);
    }
    setTimeout(() => map.invalidateSize(), 50);
  }, [map, center, radiusKm, hasGeo]);
  return null;
}

function L_circleBounds([lat, lng], radiusKm) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [[lat - dLat, lng - dLng], [lat + dLat, lng + dLng]];
}

export default function HelperMap({ location, category, stateFilter, q, radiusKm = 10, sort = 'rating' }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const hasGeo = Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lng));

  useEffect(() => {
    let active = true;
    const params = {
      limit: 50,
      sort: hasGeo ? sort : sort === 'nearest' ? 'rating' : sort,
      ...(category ? { category } : {}),
      ...(stateFilter ? { state: stateFilter } : {}),
      ...(q ? { q } : {}),
      ...(hasGeo ? { lat: location.lat, lng: location.lng, radiusKm } : {}),
    };
    api
      .get('/helpers/search', { params })
      .then((res) => active && setItems(res.data.items ?? []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [hasGeo, location?.lat, location?.lng, category, stateFilter, q, radiusKm, sort]);

  const center = hasGeo ? [location.lat, location.lng] : INDIA_CENTER;

  return (
    <div className="relative">
      <MapShell center={center} zoom={hasGeo ? 12 : 5} height={520}>
        <FitBounds center={center} radiusKm={radiusKm} hasGeo={hasGeo} />
        {hasGeo && (
          <>
            <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#0f766e', fillOpacity: 0.05 }} />
            <Marker position={center} icon={seekerIcon()} />
          </>
        )}
        <MarkerClusterGroup chunkedLoading>
          {items
            .filter((h) => h.serviceLocation?.coordinates?.length === 2)
            .map((h) => (
              <Marker
                key={h._id}
                position={toLatLng(h.serviceLocation.coordinates)}
                icon={helperPin(h.categories?.[0], { rating: h.ratingAvg, label: h.displayName })}
                eventHandlers={{ click: () => setSelected(h) }}
              />
            ))}
        </MarkerClusterGroup>
      </MapShell>

      {selected && (
        <div
          className="absolute bottom-3 left-3 z-[500] w-72 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200"
          role="dialog"
          aria-label={selected.displayName}
        >
          <div className="flex items-start justify-between">
            <p className="font-semibold text-slate-900">{selected.displayName}</p>
            <button type="button" onClick={() => setSelected(null)} className="text-slate-400" aria-label={t('common.close')}>
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {[selected.serviceLocation?.city, selected.serviceLocation?.state].filter(Boolean).join(', ')} · ★{' '}
            {selected.ratingAvg ? selected.ratingAvg.toFixed(1) : '—'}
          </p>
          {selected.priceHint && <p className="mt-1 text-xs font-medium text-slate-600">{selected.priceHint}</p>}
          <Link
            to={`/local/helpers/${selected._id}`}
            className="mt-3 block rounded-lg bg-teal-700 px-3 py-2 text-center text-sm font-semibold text-white"
          >
            {t('maps.viewProfile')}
          </Link>
        </div>
      )}
    </div>
  );
}

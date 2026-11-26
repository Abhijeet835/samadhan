import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import api from '@/lib/api';
import MapShell from './MapShell';
import MapLegend from './MapLegend';
import { bboxFromBounds, defaultCenter, toLatLng } from './geo';
import { issuePin, seekerIcon } from './pins';
import { useGeolocation } from './useGeolocation';
import { CategoryBadge, StatusBadge } from '@/features/global/StatusBadge';
import TierBadge from '@/features/global/TierBadge';
import { formatPaise } from '@/features/wallet/money';
import { loadLocalLocation } from '@/features/local/constants';
import { currentLang } from '@/features/global/localizeIssue';

const VIEW_KEY = 'samadhan_map_viewport';

function MoveWatcher({ onMove }) {
  const map = useMapEvents({ moveend: () => onMove(map) });
  useEffect(() => {
    onMove(map);
  }, [map, onMove]);
  return null;
}

function LocateControl({ onLocate }) {
  const map = useMap();
  const { locate, locating } = useGeolocation();
  return (
    <button
      type="button"
      onClick={async () => {
        const pos = await locate();
        if (pos) {
          map.setView([pos.lat, pos.lng], 14);
          onLocate(pos);
        }
      }}
      className="absolute right-3 top-3 z-[500] rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow ring-1 ring-slate-200"
    >
      {locating ? '…' : '◎'}
    </button>
  );
}

export default function GlobalMap({ category, status, minTier, center }) {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n.language);
  const [items, setItems] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [me, setMe] = useState(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  const fetch_bbox = useCallback(async (map) => {
    const bbox = bboxFromBounds(map.getBounds());
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify({ center: map.getCenter(), zoom: map.getZoom() })); } catch { /* ignore */ }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await api.get('/issues/map', {
          params: { ...bbox, limit: 200, lang, ...(category ? { category } : {}), ...(status ? { status } : {}), ...(minTier ? { minTier } : {}) },
          signal: controller.signal,
        });
        setItems(res.data.items);
        setTruncated(res.data.truncated);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') { /* keep old markers */ }
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [category, status, minTier, lang]);

  useEffect(() => () => { abortRef.current?.abort(); clearTimeout(timerRef.current); }, []);

  const initial = (() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(VIEW_KEY));
      if (saved?.center) return [saved.center.lat, saved.center.lng];
    } catch { /* ignore */ }
    return center ?? defaultCenter({ savedLocal: loadLocalLocation() });
  })();

  return (
    <div className="relative">
      <MapShell center={initial} zoom={13} height={520}>
        <MoveWatcher onMove={fetch_bbox} />
        <LocateControl onLocate={setMe} />
        {me && <Marker position={[me.lat, me.lng]} icon={seekerIcon()} />}
        <MarkerClusterGroup chunkedLoading>
          {items.map((issue) => (
            <Marker
              key={issue._id}
              position={toLatLng(issue.coordinates)}
              icon={issuePin(issue.category, { tier: issue.explosionTriggered ? Math.max(1, issue.tier || 1) : issue.tier, label: issue.title })}
              eventHandlers={{ click: () => setSelected(issue) }}
            />
          ))}
        </MarkerClusterGroup>
      </MapShell>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <MapLegend kind="issue" />
        {truncated && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{t('maps.truncated')}</span>}
        {loading && <span className="text-xs text-slate-400">{t('common.loading')}</span>}
      </div>

      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-md rounded-t-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200 sm:absolute sm:bottom-3 sm:left-3 sm:right-auto sm:w-80 sm:rounded-2xl" role="dialog" aria-label={selected.title}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <CategoryBadge category={selected.category} />
              <StatusBadge status={selected.status} />
              <TierBadge explosionTriggered={selected.explosionTriggered} issueType={selected.issueType} />
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700" aria-label={t('common.close')}>✕</button>
          </div>
          {selected.photo && <img src={selected.photo} alt="" className="mt-2 h-28 w-full rounded-lg object-cover" />}
          <p className="mt-2 font-semibold text-slate-900">{selected.title}</p>
          <p className="text-xs text-slate-500">{selected.city}</p>
          <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">
            {formatPaise(selected.fundPaise, i18n.language)}
            <span className="ml-1 text-xs font-normal text-slate-500">{t('issues.supporters', { count: selected.supporterCount })}</span>
          </p>
          <Link to={`/issues/${selected._id}`} className="mt-3 block rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white">
            {t('maps.viewDetails')}
          </Link>
        </div>
      )}
    </div>
  );
}

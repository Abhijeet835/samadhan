import { Circle, Marker } from 'react-leaflet';
import { useTranslation } from 'react-i18next';

import MapShell from './MapShell';
import { toLatLng } from './geo';
import { helperPin } from './pins';

/** Approximate service area (rounded coords) — never the exact address. */
export default function HelperAreaMap({ helper }) {
  const { t } = useTranslation();
  const coords = helper.serviceLocation?.coordinates;
  if (!Array.isArray(coords)) return null;
  const center = toLatLng(coords);
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-500">{t('maps.approxArea')}</p>
      <MapShell center={center} zoom={13} height={220} scrollWheelZoom={false}>
        <Circle center={center} radius={(helper.radiusKm ?? 5) * 1000} pathOptions={{ color: '#0f766e', fillOpacity: 0.08 }} />
        <Marker position={center} icon={helperPin(helper.categories?.[0], { label: helper.displayName })} />
      </MapShell>
    </div>
  );
}

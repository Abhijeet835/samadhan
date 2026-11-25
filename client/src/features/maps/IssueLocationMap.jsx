import { Marker } from 'react-leaflet';
import { useTranslation } from 'react-i18next';

import MapShell from './MapShell';
import { toLatLng } from './geo';
import { issuePin } from './pins';

/** Single-pin location map for the issue detail page (no scroll-zoom trap). */
export default function IssueLocationMap({ issue }) {
  const { t } = useTranslation();
  const coords = issue.location?.coordinates;
  if (!Array.isArray(coords)) return null;
  const [lng, lat] = coords;
  const osm = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div>
      <MapShell center={[lat, lng]} zoom={15} height={220} scrollWheelZoom={false}>
        <Marker position={toLatLng(coords)} icon={issuePin(issue.category, { tier: issue.explosionTriggered ? Math.max(1, issue.tier || 1) : issue.tier, label: issue.title })} />
      </MapShell>
      <a href={osm} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-xs font-semibold text-blue-700 hover:underline">
        {t('maps.openInOsm')} ↗
      </a>
    </div>
  );
}

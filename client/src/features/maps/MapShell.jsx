import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';
import './maps.css';

import { DEFAULT_CENTER } from './geo';

/**
 * Base map: OSM tiles, visible attribution, tile-error fallback. Wrapped in
 * `relative isolate z-0` so Leaflet panes never overlay dialogs/Navbar.
 */
export default function MapShell({ center = DEFAULT_CENTER, zoom = 13, height = 420, scrollWheelZoom = true, children, className = '', onReady }) {
  const { t } = useTranslation();
  const [tileError, setTileError] = useState(false);

  return (
    <div className={`relative isolate z-0 overflow-hidden rounded-xl ring-1 ring-slate-200 ${className}`} style={{ height }}>
      {tileError && (
        <div className="absolute inset-x-0 top-0 z-[500] bg-amber-50 px-3 py-1.5 text-center text-xs font-medium text-amber-800">
          {t('maps.tileError')}
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full"
        ref={onReady}
        attributionControl
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        {children}
      </MapContainer>
    </div>
  );
}

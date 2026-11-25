import { Outlet } from 'react-router-dom';

import EmergencyBanner from './EmergencyBanner';

/** Shared Local layout: the 112 banner wraps EVERY /local/* route exactly once. */
export default function LocalLayout() {
  return (
    <div className="min-h-screen bg-teal-50/40">
      <EmergencyBanner />
      <Outlet />
    </div>
  );
}

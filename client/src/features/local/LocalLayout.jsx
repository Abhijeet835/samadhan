import { Outlet } from 'react-router-dom';

/** Shared Local layout: wraps every /local/* route exactly once. */
export default function LocalLayout() {
  return (
    <div className="min-h-screen bg-teal-50/40">
      <Outlet />
    </div>
  );
}

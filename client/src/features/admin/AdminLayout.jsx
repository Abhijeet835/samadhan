import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, Flag, Users, Settings, ScrollText, Wrench, Radio, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

const TABS = [
  { to: '/admin', key: 'dashboard', icon: BarChart3, end: true },
  { to: '/admin/issues', key: 'issues', icon: Flag },
  { to: '/admin/helpers', key: 'helpers', icon: Wrench },
  { to: '/admin/users', key: 'users', icon: Users },
  { to: '/admin/dispatch', key: 'dispatch', icon: ShieldCheck },
  { to: '/admin/social', key: 'social', icon: Radio },
  { to: '/admin/settings', key: 'settings', icon: Settings },
  { to: '/admin/audit', key: 'audit', icon: ScrollText },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-slate-900 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-400" aria-hidden="true" />
          <span className="font-bold text-white">{t('admin.title')}</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row">
        <nav className="flex gap-1 overflow-x-auto md:w-52 md:flex-col" aria-label={t('admin.title')}>
          {TABS.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(`admin.tabs.${key}`)}
            </NavLink>
          ))}
        </nav>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

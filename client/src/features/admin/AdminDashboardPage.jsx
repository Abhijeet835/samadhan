import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatPaise } from '@/features/wallet/money';

const AdminCharts = lazy(() => import('./AdminCharts'));

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;
    setData(null); setError(false);
    api.get('/admin/dashboard', { params: { days } })
      .then((res) => active && setData(res.data))
      .catch(() => active && setError(true));
    return () => { active = false; };
  }, [days, reloadTick]);

  const money = (p) => formatPaise(p ?? 0, i18n.language);

  if (error) return <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center"><p className="text-slate-600">{t('admin.loadFailed')}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => setReloadTick((n) => n + 1)}>{t('common.retry')}</Button></div>;
  if (!data) return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />)}</div>;

  const kpis = [
    { label: t('admin.kpi.users'), value: data.users.total, sub: `+${data.users.newInRange}` },
    { label: t('admin.kpi.issues'), value: data.issues.total, sub: `${data.issues.open} ${t('admin.kpi.open')}` },
    { label: t('admin.kpi.helpers'), value: data.helpers.total, sub: `${data.helpers.verified} ${t('admin.kpi.verified')}` },
    { label: t('admin.kpi.openFund'), value: money(data.funds.openFundPaise), sub: t('admin.simulated') },
    { label: t('admin.kpi.grossFees'), value: money(data.simulatedRevenue.grossFeesPaise), sub: t('admin.simulated') },
    { label: t('admin.kpi.refunds'), value: money(data.simulatedRevenue.refundsPaise), sub: t('admin.simulated') },
    { label: t('admin.kpi.netRevenue'), value: money(data.simulatedRevenue.netPaise), sub: t('admin.simulated') },
    { label: t('admin.kpi.bookingCommission'), value: money(data.local?.totalCommissionPaise ?? 0), sub: t('bookings.completedShort', { count: data.local?.completedBookings ?? 0 }) },
  ];

  const attention = [
    { label: t('admin.attention.pendingHelpers'), n: data.attention.pendingHelperVerifications, to: '/admin/helpers' },
    { label: t('admin.attention.hiddenHelpers'), n: data.attention.hiddenHelpers, to: '/admin/helpers' },
    { label: t('admin.attention.failedDispatch'), n: data.attention.failedDispatch, to: '/admin/dispatch' },
    { label: t('admin.attention.failedSocial'), n: data.attention.failedSocial, to: '/admin/social' },
    { label: t('admin.attention.flaggedIssues'), n: data.attention.flaggedIssues, to: '/admin/issues?flagged=true' },
    { label: t('admin.attention.tier1Active'), n: data.attention.tier1PlusStillActive, to: '/admin/issues?exploded=true' },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('admin.tabs.dashboard')}</h1>
        <div className="flex gap-1 rounded-lg bg-slate-200 p-0.5">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={cn('rounded-md px-3 py-1 text-xs font-semibold', days === d ? 'bg-white shadow-sm' : 'text-slate-500')}>{d}d</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="pt-4">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{k.value}</p>
            <p className="text-[11px] text-slate-400">{k.sub}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="mt-4"><CardContent className="pt-4">
        <p className="mb-2 font-semibold text-slate-900">{t('admin.attention.title')}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {attention.map((a) => (
            <li key={a.label}>
              <Link to={a.to} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">
                <span className="text-slate-700">{a.label}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', a.n > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500')}>{a.n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent></Card>

      <Suspense fallback={<div className="mt-4 h-64 animate-pulse rounded-xl bg-slate-200" />}>
        <AdminCharts data={data} />
      </Suspense>
    </div>
  );
}

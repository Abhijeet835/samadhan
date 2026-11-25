import { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ISSUE_CATEGORIES } from '@/features/global/constants';
import { cn } from '@/lib/utils';

const GlobalMap = lazy(() => import('@/features/maps/GlobalMap'));

const STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function GlobalMapPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [spotlight, setSpotlight] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">{t('maps.title')}</h1>
      <p className="mt-2 text-slate-600">{t('maps.subtitle')}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" onClick={() => setCategory('')} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', !category ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}>
            {t('issues.feed.categoryAll')}
          </button>
          {ISSUE_CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', category === c ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}>
              {t(`issues.categories.${c}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs" aria-label={t('issues.feed.statusAll')}>
          <option value="">{t('maps.openStatuses')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`issues.statuses.${s}`)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={spotlight} onChange={(e) => setSpotlight(e.target.checked)} />
          {t('maps.spotlightOnly')}
        </label>
      </div>

      <div className="mt-4">
        <Suspense fallback={<div className="h-[520px] animate-pulse rounded-xl bg-slate-200" />}>
          <GlobalMap category={category} status={status} minTier={spotlight ? 1 : 0} />
        </Suspense>
      </div>
    </div>
  );
}

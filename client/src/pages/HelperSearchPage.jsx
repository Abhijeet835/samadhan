import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, MapPin } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import HelperCard from '@/features/local/HelperCard';
import { CATEGORY_ICONS, LOCAL_CATEGORIES, SEARCH_RADII, loadLocalLocation } from '@/features/local/constants';

const HelperMap = lazy(() => import('@/features/maps/HelperMap'));

export default function HelperSearchPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const location = loadLocalLocation();
  const view = params.get('view') === 'map' ? 'map' : 'list';
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [radiusKm, setRadiusKm] = useState(5);
  const [sort, setSort] = useState('nearest');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (page = 1, append = false) => {
    if (!location) return;
    if (!append) setLoading(true);
    setError(false);
    try {
      const res = await api.get('/helpers/search', {
        params: { lat: location.lat, lng: location.lng, radiusKm, sort, page, limit: 12, ...(category ? { category } : {}) },
      });
      setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setPagination(res.data.pagination);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [location, category, radiusKm, sort]);

  useEffect(() => {
    load(1);
  }, [load]);

  if (!location) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <MapPin className="mx-auto h-10 w-10 text-teal-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-slate-800">{t('local.needLocation')}</p>
        <Link to="/local">
          <Button className="mt-4 bg-teal-700 hover:bg-teal-800">{t('local.setLocationCta')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">{t('local.searchTitle')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t('local.searchSubtitle', { label: location.label })}</p>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', !category ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
        >
          {t('local.allCategories')}
        </button>
        {LOCAL_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold', category === c ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t(`local.categories.${c}`)}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 ring-1 ring-slate-200">
          {SEARCH_RADII.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadiusKm(r)}
              className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', radiusKm === r ? 'bg-teal-700 text-white' : 'text-slate-500')}
            >
              {t('local.radiusKm', { km: r })}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white p-0.5 ring-1 ring-slate-200">
          {['nearest', 'rating'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', sort === s ? 'bg-teal-700 text-white' : 'text-slate-500')}
            >
              {t(`local.sort.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
        {['list', 'map'].map((v) => (
          <button key={v} type="button" onClick={() => setParams(v === 'map' ? { view: 'map' } : {})} className={cn('flex-1 rounded-lg px-3 py-1.5 text-sm font-medium', view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
            {t(`maps.${v}View`)}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {view === 'map' ? (
          <Suspense fallback={<div className="h-[520px] animate-pulse rounded-xl bg-teal-100/60" />}>
            <HelperMap location={location} category={category} radiusKm={radiusKm} sort={sort} />
          </Suspense>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('common.loading')}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-teal-100/60" />)}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <p className="text-slate-600">{t('local.loadFailed')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>{t('common.retry')}</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-teal-200 bg-white py-16 text-center">
            <Inbox className="h-10 w-10 text-teal-200" aria-hidden="true" />
            <p className="font-medium text-slate-700">{t('local.empty')}</p>
            {radiusKm < 10 && (
              <Button size="sm" className="mt-2 bg-teal-700 hover:bg-teal-800" onClick={() => setRadiusKm(10)}>
                {t('local.try10km')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((helper) => <HelperCard key={helper._id} helper={helper} />)}
            </div>
            {pagination && pagination.page < pagination.totalPages && (
              <Button variant="outline" className="mt-6 w-full" onClick={() => load(pagination.page + 1, true)}>
                {t('common.loadMore')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
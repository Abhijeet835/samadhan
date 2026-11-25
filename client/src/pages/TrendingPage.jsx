import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Inbox, TrendingUp } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import IssueCard from '@/features/global/IssueCard';
import { useIssueMeta } from '@/features/global/useIssueMeta';
import { ISSUE_CATEGORIES } from '@/features/global/constants';

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500';

export default function TrendingPage() {
  const { t } = useTranslation();
  const meta = useIssueMeta();
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);
    setError(false);
    try {
      const res = await api.get('/issues/trending', {
        params: { page, limit: 12, ...(category ? { category } : {}), ...(city.trim() ? { city: city.trim() } : {}) },
      });
      setIssues((prev) => (append ? [...prev, ...res.data.issues] : res.data.issues));
      setPagination(res.data.pagination);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [category, city]);

  useEffect(() => {
    const id = setTimeout(() => load(1), city ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, city]);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6">
          <h1 className="flex items-center gap-2.5 text-3xl font-bold text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-sm">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </span>
            {t('trending.title')}
          </h1>
          <p className="mt-2 text-slate-600">{t('trending.subtitle')}</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} aria-label={t('issues.feed.categoryAll')}>
            <option value="">{t('issues.feed.categoryAll')}</option>
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`issues.categories.${c}`)}</option>
            ))}
          </select>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t('trending.cityPlaceholder')}
            className={inputClass}
            aria-label={t('trending.cityPlaceholder')}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('common.loading')}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <p className="text-slate-600">{t('trending.loadFailed')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>{t('common.retry')}</Button>
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="font-medium text-slate-700">{t('trending.empty')}</p>
            <p className="max-w-sm text-sm text-slate-500">{t('trending.emptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {issues.map((issue) => (
                <div key={issue._id} className="relative">
                  <IssueCard issue={issue} />
                  {typeof issue.totalReach === 'number' && issue.totalReach > 0 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2 py-0.5 text-[10px] font-bold text-teal-300 backdrop-blur">
                      <TrendingUp className="h-3 w-3" aria-hidden="true" />
                      {t('trending.reach', { count: issue.totalReach })}
                    </span>
                  )}
                </div>
              ))}
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

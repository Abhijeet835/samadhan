import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Flame, Inbox, MapPin, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import IssueCard from '@/features/global/IssueCard';
import IssueFilters from '@/features/global/IssueFilters';
import { useIssuesFeed } from '@/features/global/useIssuesFeed';

const GlobalMap = lazy(() => import('@/features/maps/GlobalMap'));

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200" />
      ))}
    </div>
  );
}

export default function IssuesPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialState = searchParams.get('state') || '';
  const { issues, pagination, filters, setFilters, loading } = useIssuesFeed({ state: initialState });
  const [view, setView] = useState('list');

  useEffect(() => {
    const urlState = searchParams.get('state') || '';
    setFilters((prev) => (prev.state === urlState ? prev : { ...prev, state: urlState, page: 1 }));
  }, [searchParams, setFilters]);

  return (
    <div className="min-h-screen bg-slate-50/70 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('issues.feed.title')}</h1>
            <p className="mt-1.5 text-sm text-slate-600 sm:text-base">{t('issues.feed.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/states">
              <Button variant="outline" className="gap-1.5">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                {t('nav.states')}
              </Button>
            </Link>
            <Link to="/trending">
              <Button variant="outline" className="gap-1.5">
                <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
                {t('nav.trending')}
              </Button>
            </Link>
            <Link to="/report">
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('issues.feed.reportCta')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="tab-bar mb-4 max-w-xs" role="tablist">
          {['list', 'map'].map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn('tab-pill', view === v ? 'tab-pill-active' : 'tab-pill-idle')}
            >
              {t(`maps.${v}View`)}
            </button>
          ))}
        </div>

        {view === 'map' ? (
          <Suspense fallback={<div className="h-[520px] animate-pulse rounded-2xl bg-slate-200" />}>
            <GlobalMap category={filters.category} status={filters.status} minTier={0} />
          </Suspense>
        ) : (
          <>
            <div className="mb-6">
              <IssueFilters filters={filters} onChange={setFilters} />
            </div>

            {loading ? (
              <FeedSkeleton />
            ) : issues.length === 0 ? (
              <div className="surface-card flex flex-col items-center gap-2 border-dashed py-16 text-center">
                <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
                <p className="font-semibold text-slate-700">{t('issues.feed.empty')}</p>
                <p className="max-w-sm text-sm text-slate-500">{t('issues.feed.emptyHint')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {issues.map((issue) => (
                    <IssueCard key={issue._id} issue={issue} />
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      {t('issues.feed.prev')}
                    </Button>
                    <span className="text-xs font-medium text-slate-500">
                      {t('issues.feed.page', { page: pagination.page, total: pagination.totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                    >
                      {t('issues.feed.next')}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Flame, Inbox, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import IssueCard from '@/features/global/IssueCard';
import IssueFilters from '@/features/global/IssueFilters';
import { useIssuesFeed } from '@/features/global/useIssuesFeed';
import { useIssueMeta } from '@/features/global/useIssueMeta';

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-xl bg-slate-200" />
      ))}
    </div>
  );
}

export default function IssuesPage() {
  const { t } = useTranslation();
  const { issues, pagination, filters, setFilters, loading } = useIssuesFeed();
  const meta = useIssueMeta();

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('issues.feed.title')}</h1>
            <p className="mt-2 text-slate-600">{t('issues.feed.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="mb-6">
          <IssueFilters filters={filters} onChange={setFilters} />
        </div>

        {loading ? (
          <FeedSkeleton />
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="font-medium text-slate-700">{t('issues.feed.empty')}</p>
            <p className="max-w-sm text-sm text-slate-500">{t('issues.feed.emptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {issues.map((issue) => (
                <IssueCard key={issue._id} issue={issue} thresholds={meta?.thresholds} />
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
                <span className="text-xs text-slate-500">
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
      </div>
    </div>
  );
}
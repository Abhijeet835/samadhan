import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatTxnDate } from '@/features/wallet/money';

export default function SupportersList({ issueId }) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (page, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(false);
      try {
        const res = await api.get(`/issues/${issueId}/supporters`, { params: { page, limit: 20 } });
        setRows((prev) => (append ? [...prev, ...res.data.supporters] : res.data.supporters));
        setPagination(res.data.pagination);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [issueId],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-2" aria-label={t('common.loading')}>
        {[0, 1, 2].map((n) => (
          <div key={n} className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-slate-500">
        {t('support.supportersLoadFailed')}
        <Button variant="outline" size="sm" className="ml-2" onClick={() => load(1)}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">{t('support.noSupporters')}</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-slate-100">
        {rows.map((row, index) => (
          <li key={`${row.displayName}-${index}`} className="flex items-center gap-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
              {row.displayName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
                {row.displayName}
                {row.isReporter && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    <Crown className="h-3 w-3" aria-hidden="true" />
                    {t('support.reporterBadge')}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">{formatTxnDate(row.supportedAt, i18n.language)}</p>
            </div>
          </li>
        ))}
      </ul>
      {pagination && pagination.page < pagination.totalPages && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          disabled={loadingMore}
          onClick={() => load(pagination.page + 1, true)}
        >
          {loadingMore ? t('common.loading') : t('common.loadMore')}
        </Button>
      )}
    </div>
  );
}

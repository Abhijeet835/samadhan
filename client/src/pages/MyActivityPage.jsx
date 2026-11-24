import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeartHandshake, Inbox, Megaphone } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CategoryBadge, StatusBadge } from '@/features/global/StatusBadge';
import { formatPaise, formatTxnDate } from '@/features/wallet/money';

const TABS = [
  { key: 'reported', endpoint: '/issues/mine', icon: Megaphone },
  { key: 'supported', endpoint: '/issues/mine/supported', icon: HeartHandshake },
];

export default function MyActivityPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('reported');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (tabKey, page, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(false);
      try {
        const endpoint = TABS.find((x) => x.key === tabKey).endpoint;
        const res = await api.get(endpoint, { params: { page, limit: 10 } });
        const items = tabKey === 'reported' ? res.data.issues : res.data.supported;
        setRows((prev) => (append ? [...prev, ...items] : items));
        setPagination(res.data.pagination);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(tab, 1);
  }, [tab, load]);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-3xl font-bold text-slate-900">{t('myActivity.title')}</h1>
        <p className="mt-2 text-slate-600">{t('myActivity.subtitle')}</p>

        <div className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label={t('myActivity.title')}>
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                if (key === tab) return;
                // Reset synchronously: the new tab must never render against
                // the previous tab's rows (different row shapes).
                setLoading(true);
                setRows([]);
                setPagination(null);
                setTab(key);
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(`myActivity.tab.${key}`)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3" aria-label={t('common.loading')}>
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-24 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <p className="text-slate-600">{t('myActivity.loadFailed')}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => load(tab, 1)}>
                {t('common.retry')}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="font-medium text-slate-700">{t(`myActivity.empty.${tab}`)}</p>
              <Link to={tab === 'reported' ? '/report' : '/issues'}>
                <Button variant="outline" size="sm" className="mt-2">
                  {tab === 'reported' ? t('issues.feed.reportCta') : t('myActivity.browseCta')}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {rows.map((row) => {
                  const issue = tab === 'reported' ? row : row.issue;
                  if (!issue) return null;
                  return (
                    <li key={`${issue._id}-${tab === 'supported' ? row.supportedAt : ''}`}>
                      <Link
                        to={`/issues/${issue._id}`}
                        className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={issue.status} />
                          <CategoryBadge category={issue.category} />
                          {tab === 'supported' && row.isReporter && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              {t('support.reporterBadge')}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-900">{issue.title}</p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="tabular-nums">
                            {formatPaise(issue.fundPaise, i18n.language)}
                            <span className="ml-1">{t('issues.fundLabel')}</span>
                            {' · '}
                            {t('issues.supporters', { count: issue.supporterCount })}
                          </span>
                          {tab === 'supported' ? (
                            <span className="font-medium text-emerald-700 tabular-nums">
                              {t('myActivity.contributed', { amount: formatPaise(row.amountPaise, i18n.language) })}
                              {' · '}
                              {formatTxnDate(row.supportedAt, i18n.language)}
                            </span>
                          ) : (
                            <span>{formatTxnDate(issue.createdAt, i18n.language)}</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {pagination && pagination.page < pagination.totalPages && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  disabled={loadingMore}
                  onClick={() => load(tab, pagination.page + 1, true)}
                >
                  {loadingMore ? t('common.loading') : t('common.loadMore')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

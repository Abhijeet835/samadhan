import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CalendarCheck, Handshake, HeartHandshake, Inbox, Megaphone } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CategoryBadge, StatusBadge } from '@/features/global/StatusBadge';
import { formatPaise, formatTxnDate } from '@/features/wallet/money';
import { getErrorMessage } from '@/lib/errors';

const TABS = [
  { key: 'bookings', endpoint: '/bookings/mine', icon: CalendarCheck },
  { key: 'reported', endpoint: '/issues/mine', icon: Megaphone },
  { key: 'supported', endpoint: '/issues/mine/supported', icon: HeartHandshake },
  { key: 'connected', endpoint: '/helpers/mine/connected', icon: Handshake },
];

export default function MyActivityPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('bookings');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (tabKey, page, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(false);
    try {
      const endpoint = TABS.find((x) => x.key === tabKey).endpoint;
      const res = await api.get(endpoint, { params: { page, limit: 10 } });
      const items =
        tabKey === 'reported' ? res.data.issues : tabKey === 'supported' ? res.data.supported : res.data.items;
      setRows((prev) => (append ? [...prev, ...items] : items));
      setPagination(res.data.pagination);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(tab, 1);
  }, [tab, load]);

  async function cancelBooking(bookingId) {
    try {
      await api.post(`/bookings/${bookingId}/transition`, { status: 'CANCELLED', note: 'Cancelled by consumer' });
      toast.success(t('bookings.statusUpdated'));
      load(tab, 1);
    } catch (err) {
      toast.error(getErrorMessage(err, t));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('myActivity.title')}</h1>
        <p className="mt-1.5 text-slate-600">{t('myActivity.subtitle')}</p>

        <div className="tab-bar mt-6 overflow-x-auto" role="tablist" aria-label={t('myActivity.title')}>
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                if (key === tab) return;
                setLoading(true);
                setRows([]);
                setPagination(null);
                setTab(key);
              }}
              className={cn('tab-pill whitespace-nowrap', tab === key ? 'tab-pill-active' : 'tab-pill-idle')}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(`myActivity.tab.${key}`)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3" aria-label={t('common.loading')}>
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : error ? (
            <div className="surface-card border-dashed py-12 text-center">
              <p className="text-slate-600">{t('myActivity.loadFailed')}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => load(tab, 1)}>
                {t('common.retry')}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="surface-card flex flex-col items-center gap-2 border-dashed py-16 text-center">
              <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="font-medium text-slate-700">{t(`myActivity.empty.${tab}`)}</p>
              <Link to={tab === 'reported' ? '/report' : tab === 'bookings' || tab === 'connected' ? '/local' : '/issues'}>
                <Button variant="outline" size="sm" className="mt-2">
                  {tab === 'reported' ? t('issues.feed.reportCta') : tab === 'bookings' || tab === 'connected' ? t('myActivity.findHelpers') : t('myActivity.browseCta')}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {rows.map((row) => {
                  if (tab === 'bookings') {
                    return (
                      <li key={row._id} className="surface-card border-teal-100 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                              {t(`bookings.statuses.${row.status}`)}
                            </span>
                            <p className="mt-1.5 font-bold text-slate-900">{row.serviceTitle}</p>
                            <p className="text-xs text-slate-500">
                              {row.helperId?.displayName} · {row.scheduledDate} ({row.timeSlot})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold tabular-nums text-slate-900">{formatPaise(row.amountPaise, i18n.language)}</p>
                            <p className="text-[11px] text-slate-400">{t(`bookings.paymentStatuses.${row.paymentStatus}`)}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {row.helperId?._id && (
                            <Link to={`/local/helpers/${row.helperId._id}`}>
                              <Button size="sm" variant="outline">{t('common.viewDetails')}</Button>
                            </Link>
                          )}
                          {['PENDING', 'ACCEPTED'].includes(row.status) && (
                            <Button size="sm" variant="outline" onClick={() => cancelBooking(row._id)} className="text-red-600">
                              {t('bookings.actions.cancel')}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  }

                  if (tab === 'connected') {
                    const helper = row.helper;
                    if (!helper) return null;
                    return (
                      <li key={helper._id}>
                        <Link to={`/local/helpers/${helper._id}`} className="surface-card-hover block border-teal-100 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">{helper.displayName}</p>
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', row.hasReviewed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                              {row.hasReviewed ? t('myActivity.reviewed') : t('myActivity.leaveReview')}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-400">
                            {t('myActivity.lastConnected', { date: formatTxnDate(row.lastConnectedAt, i18n.language) })}
                          </p>
                        </Link>
                      </li>
                    );
                  }

                  const issue = tab === 'reported' ? row : row.issue;
                  if (!issue) return null;
                  return (
                    <li key={`${issue._id}-${tab === 'supported' ? row.supportedAt : ''}`}>
                      <Link to={`/issues/${issue._id}`} className="surface-card-hover block p-4">
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
                            {tab === 'supported'
                              ? t('myActivity.youContributed', { amount: formatPaise(row.amountPaise, i18n.language) })
                              : t('issues.supporters', { count: issue.supporterCount })}
                          </span>
                          <span>{formatTxnDate(issue.createdAt, i18n.language)}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {pagination && pagination.page < pagination.totalPages && (
                <div className="mt-6 text-center">
                  <Button variant="outline" disabled={loadingMore} onClick={() => load(tab, pagination.page + 1, true)}>
                    {loadingMore ? t('common.loading') : t('common.loadMore')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Inbox } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPaise, formatTxnDate } from '@/features/wallet/money';

const ISSUE_TYPES = ['TIER_1_REACHED', 'TIER_2_REACHED', 'ISSUE_STATUS_CHANGED', 'ISSUE_REJECTED', 'ISSUE_AUTHORITY_REPLY', 'ISSUE_PLATFORM_CREDIT'];

function deepLink(n) {
  if (ISSUE_TYPES.includes(n.type)) return `/issues/${n.payload?.issueId}`;
  return '/local/dashboard';
}

function isToday(date) {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);
    setError(false);
    try {
      const res = await api.get('/notifications', { params: { page, limit: 20, ...(unreadOnly ? { unreadOnly: 'true' } : {}) } });
      setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setPagination(res.data.pagination);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => { load(1); }, [load]);

  async function open(n) {
    if (!n.readAt) {
      api.patch(`/notifications/${n._id}/read`).catch(() => {});
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    navigate(deepLink(n));
  }

  async function markAll() {
    await api.post('/notifications/read-all').catch(() => {});
    setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
  }

  const groups = { today: items.filter((n) => isToday(n.createdAt)), earlier: items.filter((n) => !isToday(n.createdAt)) };

  function renderText(n) {
    const key = `notifications.types.${n.type}`;
    const params = { ...n.payload };
    if (params.refundPaise != null) params.refund = formatPaise(params.refundPaise, i18n.language);
    if (params.amountPaise != null) params.amount = formatPaise(params.amountPaise, i18n.language);
    const text = t(key, params);
    return text === key ? t('notifications.generic') : text;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
          <Bell className="h-7 w-7 text-blue-600" aria-hidden="true" />
          {t('notifications.title')}
        </h1>
        <Button variant="outline" size="sm" onClick={markAll}>{t('notifications.markAll')}</Button>
      </div>

      <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        {[false, true].map((u) => (
          <button key={String(u)} type="button" onClick={() => setUnreadOnly(u)} className={cn('flex-1 rounded-lg px-3 py-1.5 text-sm font-medium', unreadOnly === u ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
            {u ? t('notifications.unread') : t('notifications.all')}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-200" />)}</div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <p className="text-slate-600">{t('notifications.loadFailed')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>{t('common.retry')}</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="font-medium text-slate-700">{t('notifications.empty')}</p>
          </div>
        ) : (
          <>
            {['today', 'earlier'].map((g) => groups[g].length > 0 && (
              <div key={g} className="mb-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">{t(`notifications.${g}`)}</p>
                <ul className="space-y-2">
                  {groups[g].map((n) => (
                    <li key={n._id}>
                      <button type="button" onClick={() => open(n)} className={cn('block w-full rounded-xl border p-3 text-left transition-shadow hover:shadow-md', n.readAt ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/60')}>
                        <p className="text-sm text-slate-800">{renderText(n)}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatTxnDate(n.createdAt, i18n.language)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {pagination && pagination.page < pagination.totalPages && (
              <Button variant="outline" className="w-full" onClick={() => load(pagination.page + 1, true)}>{t('common.loadMore')}</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Inbox } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatPaise } from '@/features/wallet/money';
import { useAuth } from '@/context/AuthContext';

const inputClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);
    setError(false);
    try {
      const res = await api.get('/admin/users', { params: { page, limit: 20, ...(q ? { q } : {}), ...(role ? { role } : {}) } });
      setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setPagination(res.data.pagination);
    } catch { setError(true); } finally { setLoading(false); }
  }, [q, role]);

  useEffect(() => { const id = setTimeout(() => load(1), q ? 350 : 0); return () => clearTimeout(id); }, [load, q]);

  async function openDetail(u) {
    try { const res = await api.get(`/admin/users/${u._id}`); setDetail(res.data); } catch { toast.error(t('admin.actionFailed')); }
  }

  async function toggleActive() {
    try {
      await api.patch(`/admin/users/${confirm._id}`, { isActive: !confirm.isActive });
      toast.success(t('admin.done'));
      setConfirm(null); setDetail(null); load(1);
    } catch (err) { toast.error(err.response?.data?.error?.message ?? t('admin.actionFailed')); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t('admin.tabs.users')}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.searchUsers')} className={inputClass} />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
          <option value="">{t('admin.allRoles')}</option>
          {['CITIZEN', 'HELPER', 'ADMIN'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="mt-4">
        {loading ? <div className="space-y-2">{[0, 1, 2].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-200" />)}</div>
          : error ? <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center"><p className="text-slate-600">{t('admin.loadFailed')}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>{t('common.retry')}</Button></div>
          : items.length === 0 ? <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16"><Inbox className="h-10 w-10 text-slate-300" /><p className="text-slate-700">{t('admin.empty')}</p></div>
          : (
            <ul className="space-y-2">
              {items.map((u) => (
                <li key={u._id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <button type="button" onClick={() => openDetail(u)} className="min-w-0 flex-1 text-left">
                    <p className="font-semibold text-slate-900">{u.name} {!u.isActive && <span className="text-xs text-red-600">({t('admin.disabled')})</span>}</p>
                    <p className="truncate text-xs text-slate-500">{u.email} · {u.role}{u.hasHelperProfile ? ' · helper' : ''}</p>
                  </button>
                  <span className="text-sm font-bold tabular-nums text-slate-700">{formatPaise(u.walletBalancePaise, i18n.language)}</span>
                  {u.role !== 'ADMIN' && String(u._id) !== String(me?._id) && (
                    <Button size="sm" variant="outline" className={cn(u.isActive ? 'border-red-200 text-red-700' : 'border-green-200 text-green-700')} onClick={() => setConfirm(u)}>{u.isActive ? t('admin.disable') : t('admin.enable')}</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        {pagination && pagination.page < pagination.totalPages && <Button variant="outline" className="mt-4 w-full" onClick={() => load(pagination.page + 1, true)}>{t('common.loadMore')}</Button>}
      </div>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail?.user?.name ?? ''} maxWidth="max-w-lg">
        {detail && (
          <div className="space-y-3 text-sm">
            <p className="text-slate-500">{detail.user.email} · {detail.user.phone}</p>
            <p className="font-bold tabular-nums">{formatPaise(detail.walletBalancePaise, i18n.language)}</p>
            <p className="text-xs text-slate-500">{t('admin.counts')}: {detail.counts.issuesReported} {t('admin.reported')} · {detail.counts.issuesSupported} {t('admin.supported')} · {detail.counts.connections} {t('admin.connections')}</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {detail.txns.map((tx) => <li key={tx._id} className="flex justify-between rounded bg-slate-50 px-2 py-1 text-xs"><span>{tx.type}</span><span className="tabular-nums">{formatPaise(tx.amountPaise, i18n.language)}</span></li>)}
            </ul>
          </div>
        )}
      </Dialog>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.isActive ? t('admin.disable') : t('admin.enable')}>
        <p className="text-sm text-slate-600">{confirm?.name} — {confirm?.isActive ? t('admin.disableHint') : t('admin.enableHint')}</p>
        <Button className={cn('mt-3 w-full', confirm?.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')} onClick={toggleActive}>{t('admin.confirm')}</Button>
      </Dialog>
    </div>
  );
}

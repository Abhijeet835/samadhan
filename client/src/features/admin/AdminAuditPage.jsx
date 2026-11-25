import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatTxnDate } from '@/features/wallet/money';

const inputClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

function Diff({ before, after }) {
  if (!before && !after) return null;
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {keys.map((k) => {
        const b = before?.[k]; const a = after?.[k];
        const changed = JSON.stringify(b) !== JSON.stringify(a);
        return (
          <span key={k} className={`rounded px-1.5 py-0.5 text-[10px] ${changed ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-400'}`}>
            {k}: {changed ? `${JSON.stringify(b)} → ${JSON.stringify(a)}` : JSON.stringify(a)}
          </span>
        );
      })}
    </div>
  );
}

export default function AdminAuditPage() {
  const { t, i18n } = useTranslation();
  const [action, setAction] = useState('');
  const [actions, setActions] = useState([]);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);
    setError(false);
    try {
      const res = await api.get('/admin/audit', { params: { page, limit: 50, ...(action ? { action } : {}) } });
      setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setPagination(res.data.pagination);
    } catch { setError(true); } finally { setLoading(false); }
  }, [action]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { api.get('/admin/audit/actions').then((r) => setActions(r.data.actions)).catch(() => {}); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t('admin.tabs.audit')}</h1>
      <select value={action} onChange={(e) => setAction(e.target.value)} className={`${inputClass} mt-3`}>
        <option value="">{t('admin.allActions')}</option>
        {actions.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>

      <div className="mt-4">
        {loading ? <div className="space-y-2">{[0, 1, 2].map((n) => <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-200" />)}</div>
          : error ? <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center"><p className="text-slate-600">{t('admin.loadFailed')}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>{t('common.retry')}</Button></div>
          : items.length === 0 ? <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16"><Inbox className="h-10 w-10 text-slate-300" /><p className="text-slate-700">{t('admin.empty')}</p></div>
          : (
            <ul className="space-y-2">
              {items.map((row) => (
                <li key={row._id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">{row.action}</span>
                    <span className="text-xs text-slate-500">{row.actor?.name ?? row.actor?.role ?? 'SYSTEM'}</span>
                    {row.entity && <span className="text-xs text-slate-400">{row.entity}{row.entityId ? `:${row.entityId.slice(-6)}` : ''}</span>}
                    <span className="ml-auto text-xs text-slate-400">{formatTxnDate(row.createdAt, i18n.language)}</span>
                  </div>
                  <Diff before={row.before} after={row.after} />
                </li>
              ))}
            </ul>
          )}
        {pagination && pagination.page < pagination.totalPages && <Button variant="outline" className="mt-4 w-full" onClick={() => load(pagination.page + 1, true)}>{t('common.loadMore')}</Button>}
      </div>
    </div>
  );
}

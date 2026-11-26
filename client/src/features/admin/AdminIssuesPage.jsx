import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/features/global/StatusBadge';
import TierBadge from '@/features/global/TierBadge';
import { pickIssueText } from '@/features/global/localizeIssue';
import { formatPaise } from '@/features/wallet/money';

const inputClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function AdminIssuesPage() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [flagged, setFlagged] = useState(params.get('flagged') === 'true');
  const [exploded, setExploded] = useState(params.get('exploded') === 'true');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);
    setError(false);
    try {
      const res = await api.get('/admin/issues', { params: { page, limit: 20, ...(q ? { q } : {}), ...(status ? { status } : {}), ...(flagged ? { flagged: 'true' } : {}), ...(exploded ? { exploded: 'true' } : {}) } });
      setItems((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setPagination(res.data.pagination);
    } catch { setError(true); } finally { setLoading(false); }
  }, [q, status, flagged, exploded]);

  useEffect(() => { const id = setTimeout(() => load(1), q ? 350 : 0); return () => clearTimeout(id); }, [load, q]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t('admin.tabs.issues')}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.searchIssues')} className={inputClass} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          <option value="">{t('admin.allStatuses')}</option>
          {['ACTIVE', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'].map((s) => <option key={s} value={s}>{t(`issues.statuses.${s}`)}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} />{t('admin.flaggedOnly')}</label>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={exploded} onChange={(e) => setExploded(e.target.checked)} />{t('admin.explodedOnly')}</label>
      </div>

      <div className="mt-4">
        {loading ? <div className="space-y-2">{[0, 1, 2].map((n) => <div key={n} className="h-20 animate-pulse rounded-xl bg-slate-200" />)}</div>
          : error ? <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center"><p className="text-slate-600">{t('admin.loadFailed')}</p><Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>{t('common.retry')}</Button></div>
          : items.length === 0 ? <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16"><Inbox className="h-10 w-10 text-slate-300" /><p className="text-slate-700">{t('admin.empty')}</p></div>
          : (
            <ul className="space-y-2">
              {items.map((raw) => {
                const issue = pickIssueText(raw, i18n.language);
                return (
                <li key={issue._id}>
                  <Link to={`/admin/issues/${issue._id}`} className="block rounded-xl bg-white p-4 ring-1 ring-slate-200 hover:ring-slate-300">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={issue.status} /><TierBadge explosionTriggered={issue.explosionTriggered} issueType={issue.issueType} />
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">{issue.language || 'en'}</span>
                      {issue.flagCount > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">{issue.flagCount} flags</span>}
                      {(issue.failedDispatch + issue.failedSocial) > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{issue.failedDispatch + issue.failedSocial} failed</span>}
                      <span className="ml-auto text-sm font-bold tabular-nums text-slate-900">{formatPaise(issue.fundPaise, i18n.language)}</span>
                    </div>
                    <p className="mt-1 font-semibold text-slate-900">{issue.title}</p>
                    <p className="text-xs text-slate-500">{issue.reporter?.name} · {raw.location?.city || issue.city} · {issue.supporterCount} supporters</p>
                  </Link>
                </li>
                );
              })}
            </ul>
          )}
        {pagination && pagination.page < pagination.totalPages && <Button variant="outline" className="mt-4 w-full" onClick={() => load(pagination.page + 1, true)}>{t('common.loadMore')}</Button>}
      </div>
    </div>
  );
}

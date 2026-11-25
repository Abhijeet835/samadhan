import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/features/global/StatusBadge';
import TierBadge from '@/features/global/TierBadge';
import { formatPaise, formatTxnDate } from '@/features/wallet/money';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

export default function AdminIssueDetailPage() {
  const { issueId } = useParams();
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [authorities, setAuthorities] = useState([]);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [reply, setReply] = useState('');
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditRupees, setCreditRupees] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const creditKey = useRef(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get(`/admin/issues/${issueId}`);
      setData(res.data);
    } catch { setError(true); }
  }, [issueId]);

  useEffect(() => { load(); api.get('/admin/authorities').then((r) => setAuthorities(r.data.authorities)).catch(() => {}); }, [load]);

  async function act(fn, successKey) {
    setBusy(true);
    try { await fn(); toast.success(t(successKey)); load(); }
    catch (err) { toast.error(err.response?.data?.error?.message ?? t('admin.actionFailed')); }
    finally { setBusy(false); }
  }

  if (error) return <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center"><p className="text-slate-600">{t('admin.loadFailed')}</p><Button variant="outline" size="sm" className="mt-3" onClick={load}>{t('common.retry')}</Button></div>;
  if (!data) return <div className="h-96 animate-pulse rounded-xl bg-slate-200" />;

  const { issue, contributors, timeline, flags, allowedTransitions, authority } = data;
  const money = (p) => formatPaise(p ?? 0, i18n.language);

  return (
    <div>
      <Link to="/admin/issues" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />{t('admin.tabs.issues')}</Link>
      <Card><CardContent className="pt-5">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={issue.status} /><TierBadge explosionTriggered={issue.explosionTriggered} issueType={issue.issueType} /></div>
        <h1 className="mt-2 text-xl font-bold text-slate-900">{issue.title}</h1>
        <p className="text-xs text-slate-500">{issue.reporterId?.name} · {issue.reporterId?.email}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 p-2"><p className="text-lg font-bold tabular-nums">{money(issue.fundPaise)}</p><p className="text-[11px] text-slate-500">{t('issues.fundLabel')}</p></div>
          <div className="rounded-lg bg-slate-50 p-2"><p className="text-lg font-bold tabular-nums">{issue.supporterCount}</p><p className="text-[11px] text-slate-500">{t('admin.supporters')}</p></div>
          <div className="rounded-lg bg-slate-50 p-2"><p className="text-lg font-bold tabular-nums">{money(issue.platformCreditPaise)}</p><p className="text-[11px] text-slate-500">{t('admin.platformCredit')}</p></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {allowedTransitions.filter((s) => s !== 'REJECTED').map((s) => (
            <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.post(`/admin/issues/${issueId}/transition`, { status: s }), 'admin.done')}>{t(`issues.statuses.${s}`)}</Button>
          ))}
          {allowedTransitions.includes('REJECTED') && <Button size="sm" variant="outline" className="border-red-200 text-red-700" disabled={busy} onClick={() => setRejectOpen(true)}>{t('issues.statuses.REJECTED')}</Button>}
          <Button size="sm" className="bg-teal-700 hover:bg-teal-800" disabled={busy} onClick={() => { creditKey.current = `credit:${crypto.randomUUID()}`; setCreditOpen(true); }}>{t('admin.addCredit')}</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.post(`/admin/issues/${issueId}/recheck-tiers`), 'admin.done')}>{t('admin.recheckTiers')}</Button>
        </div>
      </CardContent></Card>

      <Card className="mt-4"><CardContent className="pt-5">
        <p className="font-semibold text-slate-900">{t('admin.authority')}</p>
        <div className="mt-2 flex gap-2">
          <select className={inputClass} value={authority?._id ?? ''} onChange={(e) => act(() => api.patch(`/admin/issues/${issueId}/authority`, { authorityId: e.target.value || null }), 'admin.done')} disabled={busy}>
            <option value="">{t('admin.unassigned')}</option>
            {authorities.map((a) => <option key={a._id} value={a._id}>{a.nameEn}</option>)}
          </select>
        </div>
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder={t('admin.replyPlaceholder')} className={`${inputClass} mt-2`} />
        <Button size="sm" className="mt-2" disabled={busy || reply.trim().length < 10} onClick={() => act(async () => { await api.post(`/admin/issues/${issueId}/authority-reply`, { message: reply.trim() }); setReply(''); }, 'admin.done')}>{t('admin.recordReply')}</Button>
        <p className="mt-1 text-[11px] text-slate-400">{t('admin.replyDisclaimer')}</p>
      </CardContent></Card>

      {flags.length > 0 && (
        <Card className="mt-4"><CardContent className="pt-5">
          <div className="flex items-center justify-between"><p className="font-semibold text-slate-900">{t('admin.flags')} ({flags.length})</p>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => api.post(`/admin/issues/${issueId}/flags/dismiss`), 'admin.done')}>{t('admin.dismissFlags')}</Button></div>
          <ul className="mt-2 space-y-1 text-sm">{flags.map((f) => <li key={f._id} className="rounded-lg bg-slate-50 px-3 py-1.5"><span className="font-semibold">{f.reason}</span> — {f.userId?.name} {f.dismissed && <span className="text-xs text-slate-400">({t('admin.dismissed')})</span>}</li>)}</ul>
        </CardContent></Card>
      )}

      <Card className="mt-4"><CardContent className="pt-5">
        <p className="font-semibold text-slate-900">{t('admin.contributors')} · {contributors.count} · {money(contributors.totalPaise)}</p>
        <ul className="mt-2 space-y-1 text-sm">{contributors.top.map((c, i) => <li key={i} className="flex justify-between"><span>{c.name}{c.isReporter ? ' ★' : ''}</span><span className="tabular-nums">{money(c.amountPaise)}</span></li>)}</ul>
      </CardContent></Card>

      <Card className="mt-4"><CardContent className="pt-5">
        <p className="font-semibold text-slate-900">{t('issues.detail.timelineTitle')}</p>
        <ul className="mt-2 space-y-2 text-sm">
          {timeline.map((row) => (
            <li key={row._id} className="border-l-2 border-slate-200 pl-3">
              <p className="text-slate-700">
                {row.kind === 'PLATFORM_CREDIT' ? row.note
                  : row.kind === 'AUTHORITY_REPLY' ? `${t('admin.replyRecorded')}${row.authorityId?.nameEn ? ` — ${row.authorityId.nameEn}` : ''}: ${row.note}`
                  : row.kind === 'AUTHORITY_ASSIGNED' ? row.note
                  : `${row.fromStatus ?? '—'} → ${row.toStatus}`}
              </p>
              <p className="text-xs text-slate-400">{row.actorRole} · {formatTxnDate(row.createdAt, i18n.language)}</p>
            </li>
          ))}
        </ul>
      </CardContent></Card>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} title={t('admin.rejectTitle')}>
        <p className="text-sm text-slate-600">{t('admin.rejectSummary', { count: contributors.count, amount: money(contributors.totalPaise) })}</p>
        <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder={t('admin.rejectReason')} className={`${inputClass} mt-3`} />
        <Button className="mt-3 w-full bg-red-600 hover:bg-red-700" disabled={busy || rejectNote.trim().length < 10} onClick={() => act(async () => { await api.post(`/admin/issues/${issueId}/transition`, { status: 'REJECTED', note: rejectNote.trim() }); setRejectOpen(false); }, 'admin.done')}>{t('admin.confirmReject')}</Button>
      </Dialog>

      <Dialog open={creditOpen} onClose={() => setCreditOpen(false)} title={t('admin.addCredit')}>
        <label className="text-xs font-semibold text-slate-500">{t('admin.amountRupees')}</label>
        <input type="number" min="1" value={creditRupees} onChange={(e) => setCreditRupees(e.target.value)} className={`${inputClass} mt-1`} />
        <label className="mt-3 block text-xs font-semibold text-slate-500">{t('admin.reason')}</label>
        <input value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className={`${inputClass} mt-1`} />
        <Button className="mt-3 w-full bg-teal-700 hover:bg-teal-800" disabled={busy || !creditRupees || creditReason.trim().length < 5}
          onClick={() => act(async () => { await api.post(`/admin/issues/${issueId}/credit`, { amountPaise: Math.round(Number(creditRupees) * 100), reason: creditReason.trim(), idempotencyKey: creditKey.current }); setCreditOpen(false); setCreditRupees(''); setCreditReason(''); }, 'admin.done')}>
          {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{t('admin.confirmCredit')}
        </Button>
      </Dialog>
    </div>
  );
}

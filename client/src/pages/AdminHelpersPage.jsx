import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, EyeOff, Inbox, Loader2, ShieldCheck, X } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LOCAL_CATEGORIES } from '@/features/local/constants';

const STATUS_STYLES = {
  VERIFIED: 'bg-green-50 text-green-700 ring-green-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
};

const selectClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-500';

/** Minimal admin helper queue — full Admin UI expands in Phase 8. */
export default function AdminHelpersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState('');
  const [hidden, setHidden] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);
    setError(false);
    try {
      const res = await api.get('/admin/helpers', {
        params: { page, limit: 20, ...(status ? { verificationStatus: status } : {}), ...(hidden ? { isHidden: hidden } : {}), ...(category ? { category } : {}) },
      });
      setRows((prev) => (append ? [...prev, ...res.data.rows] : res.data.rows));
      setPagination(res.data.pagination);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status, hidden, category]);

  useEffect(() => {
    load(1);
  }, [load]);

  async function patch(helper, body, successKey) {
    setBusyId(helper._id);
    try {
      const res = await api.patch(`/admin/helpers/${helper._id}`, body);
      setRows((prev) => prev.map((r) => (r._id === helper._id ? res.data.helper : r)));
      toast.success(t(successKey));
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? t('adminHelpers.actionFailed'));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    await patch(rejecting, { verificationStatus: 'REJECTED', rejectionReason: reason.trim() }, 'adminHelpers.rejected');
    setRejecting(null);
    setReason('');
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
          <ShieldCheck className="h-7 w-7 text-teal-700" aria-hidden="true" />
          {t('adminHelpers.title')}
        </h1>
        <p className="mt-2 text-slate-600">{t('adminHelpers.subtitle')}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass} aria-label={t('adminHelpers.filterStatus')}>
            <option value="">{t('adminHelpers.filterStatus')}</option>
            {['PENDING', 'VERIFIED', 'REJECTED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={hidden} onChange={(e) => setHidden(e.target.value)} className={selectClass} aria-label={t('adminHelpers.filterHidden')}>
            <option value="">{t('adminHelpers.filterHidden')}</option>
            <option value="true">{t('adminHelpers.hiddenOnly')}</option>
            <option value="false">{t('adminHelpers.visibleOnly')}</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass} aria-label={t('adminHelpers.filterCategory')}>
            <option value="">{t('adminHelpers.filterCategory')}</option>
            {LOCAL_CATEGORIES.map((c) => <option key={c} value={c}>{t(`local.categories.${c}`)}</option>)}
          </select>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="space-y-3" aria-label={t('common.loading')}>
              {[0, 1, 2].map((n) => <div key={n} className="h-28 animate-pulse rounded-xl bg-slate-200" />)}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <p className="text-slate-600">{t('adminHelpers.loadFailed')}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>{t('common.retry')}</Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="font-medium text-slate-700">{t('adminHelpers.empty')}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((helper) => (
                <li key={helper._id}>
                  <Card className={cn(helper.isHidden && 'border-red-200')}>
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1', STATUS_STYLES[helper.verificationStatus])}>
                          {helper.verificationStatus}
                        </span>
                        {helper.isHidden && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
                            <EyeOff className="h-3 w-3" /> {t('adminHelpers.hidden')}
                          </span>
                        )}
                        {helper.isSample && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">SAMPLE</span>
                        )}
                        <span className="ml-auto text-xs text-slate-400">{t('adminHelpers.flags', { count: helper.flagCount })}</span>
                      </div>
                      <p className="mt-2 font-semibold text-slate-900">{helper.displayName}</p>
                      <p className="text-xs text-slate-500">
                        {helper.userId?.email} · +91 {helper.phone} · {helper.serviceLocation?.city}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {helper.categories.map((c) => (
                          <span key={c} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">{t(`local.categories.${c}`)}</span>
                        ))}
                      </div>
                      {helper.rejectionReason && <p className="mt-1 text-xs text-red-600">{helper.rejectionReason}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {helper.verificationStatus !== 'VERIFIED' && (
                          <Button size="sm" className="gap-1.5 bg-teal-700 hover:bg-teal-800" disabled={busyId === helper._id} onClick={() => patch(helper, { verificationStatus: 'VERIFIED' }, 'adminHelpers.approved')}>
                            {busyId === helper._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            {t('adminHelpers.approve')}
                          </Button>
                        )}
                        {helper.verificationStatus !== 'REJECTED' && (
                          <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-700" disabled={busyId === helper._id} onClick={() => setRejecting(helper)}>
                            <X className="h-3.5 w-3.5" />
                            {t('adminHelpers.reject')}
                          </Button>
                        )}
                        {helper.isHidden && (
                          <Button size="sm" variant="outline" disabled={busyId === helper._id} onClick={() => patch(helper, { isHidden: false }, 'adminHelpers.unhidden')}>
                            {t('adminHelpers.unhide')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          {pagination && pagination.page < pagination.totalPages && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => load(pagination.page + 1, true)}>{t('common.loadMore')}</Button>
          )}
        </div>
      </div>

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} title={t('adminHelpers.rejectTitle')}>
        <p className="text-sm text-slate-600">{rejecting?.displayName}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder={t('adminHelpers.rejectReason')}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-red-400"
        />
        <Button onClick={confirmReject} className="mt-3 w-full bg-red-600 hover:bg-red-700">{t('adminHelpers.confirmReject')}</Button>
      </Dialog>
    </div>
  );
}

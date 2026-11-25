import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Star, Users } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatTxnDate } from '@/features/wallet/money';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-500';

export default function HelperDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/helpers/me/dashboard');
      setData(res.data);
      setEdit({
        displayName: res.data.helper.displayName,
        phone: res.data.helper.phone,
        bio: res.data.helper.bio,
        priceHint: res.data.helper.priceHint,
        radiusKm: res.data.helper.radiusKm,
      });
    } catch (err) {
      if (err.response?.status === 404) navigate('/local/register', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAvailable() {
    try {
      const res = await api.patch('/helpers/me', { isAvailable: !data.helper.isAvailable });
      setData((prev) => ({ ...prev, helper: res.data.helper }));
    } catch {
      toast.error(t('local.saveFailed'));
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.patch('/helpers/me', {
        displayName: edit.displayName,
        phone: edit.phone,
        bio: edit.bio,
        priceHint: edit.priceHint,
        radiusKm: Number(edit.radiusKm),
      });
      setData((prev) => ({ ...prev, helper: res.data.helper }));
      if (res.data.helper.verificationStatus === 'PENDING' && data.helper.verificationStatus === 'VERIFIED') {
        toast(t('local.reverifyNotice'), { duration: 6000 });
      } else {
        toast.success(t('local.saved'));
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? t('local.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return <div className="mx-auto max-w-3xl px-4 py-8"><div className="h-96 animate-pulse rounded-xl bg-teal-100/50" aria-label={t('common.loading')} /></div>;
  }

  const { helper, stats, connections, reviews } = data;
  const status = helper.verificationStatus;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">{t('local.dashboardTitle')}</h1>

      <div
        className={cn(
          'mt-4 flex items-start gap-3 rounded-xl border p-4',
          status === 'VERIFIED' && 'border-green-200 bg-green-50 text-green-800',
          status === 'PENDING' && 'border-amber-200 bg-amber-50 text-amber-800',
          status === 'REJECTED' && 'border-red-200 bg-red-50 text-red-800',
        )}
        role="status"
      >
        {status === 'VERIFIED' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : status === 'PENDING' ? <Clock className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
        <div>
          <p className="font-bold">{t(`local.verification.${status}`)}</p>
          <p className="text-sm opacity-90">{t(`local.verificationHint.${status}`)}</p>
          {status === 'REJECTED' && helper.rejectionReason && <p className="mt-1 text-sm font-medium">{helper.rejectionReason}</p>}
        </div>
      </div>

      {helper.isHidden && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          {t('local.hiddenWarning')}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: t('local.statConnects'), value: stats.connectCount, icon: Users },
          { label: t('local.statRating'), value: stats.ratingAvg ? `${stats.ratingAvg.toFixed(1)} (${stats.ratingCount})` : '—', icon: Star },
          { label: t('local.statFlags'), value: stats.flagCount, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 text-center">
              <Icon className="mx-auto h-4 w-4 text-teal-600" aria-hidden="true" />
              <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="flex items-center justify-between pt-5">
          <div>
            <p className="font-semibold text-slate-900">{t('local.availableNow')}</p>
            <p className="text-xs text-slate-500">{t('local.availableHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={helper.isAvailable}
            onClick={toggleAvailable}
            className={cn('relative h-7 w-12 rounded-full transition-colors', helper.isAvailable ? 'bg-teal-600' : 'bg-slate-300')}
          >
            <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', helper.isAvailable ? 'left-6' : 'left-1')} />
          </button>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-6">
          <p className="font-bold text-slate-900">{t('local.editProfile')}</p>
          <form onSubmit={saveProfile} className="mt-3 space-y-3">
            <input className={inputClass} value={edit.displayName} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} maxLength={80} />
            <input className={inputClass} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} pattern="[6-9][0-9]{9}" />
            <textarea className={inputClass} rows={3} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} minLength={20} maxLength={600} />
            <div className="grid grid-cols-2 gap-3">
              <input className={inputClass} value={edit.priceHint} onChange={(e) => setEdit({ ...edit, priceHint: e.target.value })} maxLength={80} />
              <select className={inputClass} value={edit.radiusKm} onChange={(e) => setEdit({ ...edit, radiusKm: e.target.value })}>
                {Array.from({ length: 25 }, (_, i) => i + 1).map((km) => <option key={km} value={km}>{km} km</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-400">{t('local.reverifyHint')}</p>
            <Button type="submit" disabled={saving} className="gap-2 bg-teal-700 hover:bg-teal-800">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('local.saveProfile')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-6">
          <p className="font-bold text-slate-900">{t('local.recentConnects')}</p>
          <ul className="mt-2 divide-y divide-slate-100">
            {connections.items.map((c, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-slate-700">{c.seekerName}</span>
                <span className="text-xs text-slate-400">{formatTxnDate(c.connectedAt, i18n.language)}</span>
              </li>
            ))}
            {connections.items.length === 0 && <p className="py-2 text-sm text-slate-400">{t('local.noConnects')}</p>}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="pt-6">
          <p className="font-bold text-slate-900">{t('local.receivedReviews')}</p>
          <ul className="mt-2 divide-y divide-slate-100">
            {reviews.map((r, i) => (
              <li key={i} className="py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{r.reviewerName}</span>
                  <span className="font-semibold text-amber-600">{r.rating}★</span>
                </div>
                {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
              </li>
            ))}
            {reviews.length === 0 && <p className="py-2 text-sm text-slate-400">{t('local.noReviews')}</p>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

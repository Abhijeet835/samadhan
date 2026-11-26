import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, IndianRupee, Loader2, Star, Users } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LOCAL_CATEGORIES, normalizeLocalCat } from '@/features/local/constants';
import { formatPaise, formatTxnDate } from '@/features/wallet/money';
import { getErrorMessage } from '@/lib/errors';
import { useNotifications } from '@/features/notifications/useNotifications';

const DASHBOARD_TABS = ['bookings', 'contacts', 'profile', 'reviews'];

const BOOKING_BADGE = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
};

export default function HelperDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { unreadCount } = useNotifications();
  const lastUnread = useRef(null);
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState(LOCAL_CATEGORIES);
  const [bookings, setBookings] = useState([]);
  const [bookingSummary, setBookingSummary] = useState({ completedCount: 0, grossPaise: 0, commissionPaise: 0, netPayoutPaise: 0 });
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState(() => (DASHBOARD_TABS.includes(requestedTab) ? requestedTab : 'bookings'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [dashRes, bookRes, metaRes] = await Promise.all([
        api.get('/helpers/me/dashboard', { params: { limit: 50 } }),
        api.get('/bookings/provider'),
        api.get('/helpers/meta').catch(() => null),
      ]);
      if (Array.isArray(metaRes?.data?.categories) && metaRes.data.categories.length > 0) {
        setCategories(metaRes.data.categories);
      }
      setData(dashRes.data);
      const h = dashRes.data.helper;
      setEdit({
        displayName: h.displayName,
        phone: h.phone,
        categories: (h.categories ?? []).map(normalizeLocalCat),
        basePriceRupees: Math.round((h.basePricePaise ?? 29900) / 100),
        bio: h.bio,
        priceHint: h.priceHint,
        radiusKm: h.radiusKm,
      });
      setBookings(bookRes.data.items ?? []);
      setBookingSummary(bookRes.data.summary ?? {});
    } catch (err) {
      if (err.response?.status === 404) navigate('/local/register', { replace: true });
      else setError(true);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  // A new contact/booking notification should refresh this page so the
  // "who contacted me" list and its New badges stay current without a reload.
  useEffect(() => {
    if (lastUnread.current === null) {
      lastUnread.current = unreadCount;
      return;
    }
    if (unreadCount > lastUnread.current) load();
    lastUnread.current = unreadCount;
  }, [unreadCount, load]);

  // Deep links (e.g. a HELPER_NEW_CONNECT notification) can change ?tab while
  // this page is already mounted, so keep the active tab in sync with the URL.
  useEffect(() => {
    if (requestedTab && DASHBOARD_TABS.includes(requestedTab) && requestedTab !== tab) setTab(requestedTab);
  }, [requestedTab, tab]);

  function selectTab(next) {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  async function toggleAvailable() {
    try {
      const res = await api.patch('/helpers/me', { isAvailable: !data.helper.isAvailable });
      setData((prev) => ({ ...prev, helper: res.data.helper }));
    } catch (err) {
      toast.error(getErrorMessage(err, t));
    }
  }

  async function updateBookingStatus(bookingId, status) {
    setActingId(bookingId);
    try {
      await api.post(`/bookings/${bookingId}/transition`, { status });
      toast.success(t('bookings.statusUpdated'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, t));
    } finally {
      setActingId(null);
    }
  }

  function toggleCategory(cat) {
    setEdit((prev) => {
      const has = prev.categories.includes(cat);
      if (has) {
        if (prev.categories.length === 1) return prev;
        return { ...prev, categories: prev.categories.filter((c) => c !== cat) };
      }
      if (prev.categories.length >= 4) return prev;
      return { ...prev, categories: [...prev.categories, cat] };
    });
  }

  async function saveProfile(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.patch('/helpers/me', {
        displayName: edit.displayName,
        phone: edit.phone,
        categories: edit.categories,
        basePricePaise: Math.max(100, Math.round((Number(edit.basePriceRupees) || 299) * 100)),
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
      toast.error(getErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="surface-card border-dashed py-12 text-center">
          <p className="text-slate-600">{t('local.loadFailed')}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={load}>{t('common.retry')}</Button>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return <div className="mx-auto max-w-4xl px-4 py-8"><div className="h-96 animate-pulse rounded-2xl bg-teal-100/50" aria-label={t('common.loading')} /></div>;
  }

  const { helper, stats, connections, reviews } = data;
  const status = helper.verificationStatus;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const newContacts = connections.items.filter((c) => new Date(c.connectedAt).getTime() >= dayAgo).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('local.dashboardTitle')}</h1>

      <div
        className={cn(
          'mt-4 flex items-start gap-3 rounded-2xl border p-4',
          status === 'VERIFIED' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
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
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          {t('local.hiddenWarning')}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('bookings.completedTitle'), value: bookingSummary.completedCount ?? helper.bookingCount ?? 0, icon: CalendarCheck },
          { label: t('bookings.netEarnings'), value: formatPaise(bookingSummary.netPayoutPaise ?? helper.totalEarningsPaise ?? 0, i18n.language), icon: IndianRupee },
          { label: t('local.statRating'), value: stats.ratingAvg ? `${stats.ratingAvg.toFixed(1)} (${stats.ratingCount})` : '—', icon: Star },
          { label: t('local.statConnects'), value: stats.connectCount, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 text-center">
              <Icon className="mx-auto h-4 w-4 text-teal-700" aria-hidden="true" />
              <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">{value}</p>
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
            aria-label={t('local.availableNow')}
            aria-checked={helper.isAvailable}
            onClick={toggleAvailable}
            className={cn('relative h-7 w-12 rounded-full transition-colors', helper.isAvailable ? 'bg-teal-600' : 'bg-slate-300')}
          >
            <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', helper.isAvailable ? 'left-6' : 'left-1')} />
          </button>
        </CardContent>
      </Card>

      <div className="tab-bar mt-6" role="tablist">
        {DASHBOARD_TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => selectTab(key)}
            className={cn('tab-pill relative', tab === key ? 'tab-pill-active' : 'tab-pill-idle')}
          >
            {t(`bookings.providerTab.${key}`)}
            {key === 'contacts' && newContacts > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
                {newContacts}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <div className="mt-5 space-y-4">
          {bookingSummary.commissionPaise > 0 && (
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-xs font-medium text-teal-900">
              {t('bookings.commissionBanner', {
                gross: formatPaise(bookingSummary.grossPaise, i18n.language),
                commission: formatPaise(bookingSummary.commissionPaise, i18n.language),
                net: formatPaise(bookingSummary.netPayoutPaise, i18n.language),
              })}
            </div>
          )}

          {bookings.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-slate-500">{t('bookings.emptyProvider')}</CardContent></Card>
          ) : (
            bookings.map((b) => (
              <Card key={b._id} className="border-slate-200">
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold', BOOKING_BADGE[b.status] ?? 'bg-slate-100')}>
                        {t(`bookings.statuses.${b.status}`)}
                      </span>
                      <h3 className="mt-1.5 font-bold text-slate-900">{b.serviceTitle}</h3>
                      <p className="text-xs text-slate-500">
                        {b.consumerName} · {b.scheduledDate} ({b.timeSlot})
                      </p>
                      <p className="mt-1 text-xs text-slate-600">{[b.serviceAddress?.address, b.serviceAddress?.city, b.serviceAddress?.state].filter(Boolean).join(', ')}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-base font-extrabold tabular-nums text-slate-900">{formatPaise(b.amountPaise, i18n.language)}</p>
                      <p className="text-slate-500">{t('bookings.payoutLine', { payout: formatPaise(b.providerPayoutPaise, i18n.language), pct: b.commissionRatePercent })}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {b.status === 'PENDING' && (
                      <>
                        <Button size="sm" disabled={actingId === b._id} onClick={() => updateBookingStatus(b._id, 'ACCEPTED')} className="bg-teal-700 hover:bg-teal-800">
                          {t('bookings.actions.accept')}
                        </Button>
                        <Button size="sm" variant="outline" disabled={actingId === b._id} onClick={() => updateBookingStatus(b._id, 'REJECTED')} className="text-red-600">
                          {t('bookings.actions.reject')}
                        </Button>
                      </>
                    )}
                    {b.status === 'ACCEPTED' && (
                      <>
                        <Button size="sm" disabled={actingId === b._id} onClick={() => updateBookingStatus(b._id, 'IN_PROGRESS')} className="bg-blue-600 hover:bg-blue-700">
                          {t('bookings.actions.start')}
                        </Button>
                        <Button size="sm" disabled={actingId === b._id} onClick={() => updateBookingStatus(b._id, 'COMPLETED')} className="bg-emerald-600 hover:bg-emerald-700">
                          {t('bookings.actions.complete')}
                        </Button>
                      </>
                    )}
                    {b.status === 'IN_PROGRESS' && (
                      <Button size="sm" disabled={actingId === b._id} onClick={() => updateBookingStatus(b._id, 'COMPLETED')} className="bg-emerald-600 hover:bg-emerald-700">
                        {t('bookings.actions.complete')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'profile' && (
        <Card className="mt-5">
          <CardContent className="pt-6">
            <p className="font-bold text-slate-900">{t('local.editProfile')}</p>
            <form onSubmit={saveProfile} className="mt-3 space-y-3">
              <input className="field-input" value={edit.displayName} onChange={(e) => setEdit({ ...edit, displayName: e.target.value })} maxLength={80} />
              <input className="field-input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} pattern="[6-9][0-9]{9}" />
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={cn('rounded-full px-3 py-1 text-xs font-semibold transition', edit.categories.includes(c) ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600')}
                  >
                    {t(`local.categories.${c}`)}
                  </button>
                ))}
              </div>
              <textarea className="field-input" rows={3} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} minLength={20} maxLength={600} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input className="field-input" type="number" min={50} max={50000} value={edit.basePriceRupees} onChange={(e) => setEdit({ ...edit, basePriceRupees: e.target.value })} />
                <input className="field-input" value={edit.priceHint} onChange={(e) => setEdit({ ...edit, priceHint: e.target.value })} maxLength={80} />
                <select className="field-input" value={edit.radiusKm} onChange={(e) => setEdit({ ...edit, radiusKm: e.target.value })}>
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((km) => <option key={km} value={km}>{km} km</option>)}
                </select>
              </div>
              <p className="text-xs text-amber-700">{t('local.reverifyHint')}</p>
              <Button type="submit" disabled={saving} className="gap-2 bg-teal-700 hover:bg-teal-800">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('profile.save')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === 'contacts' && (
        <Card className="mt-5">
          <CardContent className="pt-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900">{t('local.contactsTitle')}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t('local.contactsHint')}</p>
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">
                {t('local.contactsTotal', { count: connections.pagination?.total ?? connections.items.length })}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {connections.items.map((c) => {
                const isNew = new Date(c.connectedAt).getTime() >= dayAgo;
                return (
                  <li key={c._id ?? `${c.seekerName}-${c.connectedAt}`} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                        <Users className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="truncate font-medium text-slate-800">{c.seekerName}</span>
                      {isNew && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                          {t('local.contactNew')}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{formatTxnDate(c.connectedAt, i18n.language)}</span>
                  </li>
                );
              })}
              {connections.items.length === 0 && (
                <li className="py-8 text-center text-sm text-slate-400">{t('local.contactsEmpty')}</li>
              )}
            </ul>
            {newContacts > 0 && (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                {t('local.contactsNewHint', { count: newContacts })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'reviews' && (
        <Card className="mt-5">
          <CardContent className="pt-5">
            <p className="font-bold text-slate-900">{t('local.recentReviews')}</p>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {reviews.map((r, i) => (
                <li key={i} className="py-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">{r.reviewerName}</span>
                    <span className="font-bold text-amber-600">{r.rating}★</span>
                  </div>
                  {r.comment && <p className="mt-0.5 text-slate-600">{r.comment}</p>}
                </li>
              ))}
              {reviews.length === 0 && <p className="py-3 text-slate-400">{t('local.noReviews')}</p>}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

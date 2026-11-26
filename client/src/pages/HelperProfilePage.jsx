import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, CalendarCheck, Flag, Loader2, LogIn, MapPin, Phone, ShieldAlert, Star } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { CATEGORY_ICONS, normalizeLocalCat } from '@/features/local/constants';
import BookServiceDialog from '@/features/local/BookServiceDialog';
import { formatPaise, formatTxnDate } from '@/features/wallet/money';
import { getErrorMessage } from '@/lib/errors';
import { getStateLabel } from '@/lib/indiaLocations';

const HelperAreaMap = lazy(() => import('@/features/maps/HelperAreaMap'));

function Stars({ value, size = 'h-4 w-4' }) {
  return (
    <span className="inline-flex" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(size, n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} aria-hidden="true" />
      ))}
    </span>
  );
}

export default function HelperProfilePage() {
  const { helperId } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contact, setContact] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/helpers/${helperId}`);
      setData(res.data);
      if (res.data.viewer.myReview) {
        setRating(res.data.viewer.myReview.rating);
        setComment(res.data.viewer.myReview.comment ?? '');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [helperId]);

  useEffect(() => { load(); }, [load]);

  async function connect() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setConnecting(true);
    try {
      const res = await api.post(`/helpers/${helperId}/connect`);
      setContact(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, t));
    } finally {
      setConnecting(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!rating || submittingReview) return;
    setSubmittingReview(true);
    try {
      const res = await api.post(`/helpers/${helperId}/review`, { rating, comment });
      toast.success(res.data.updated ? t('local.reviewUpdated') : t('local.reviewCreated'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, t));
    } finally {
      setSubmittingReview(false);
    }
  }

  async function submitFlag() {
    if (flagReason.trim().length < 5 || flagging) return;
    setFlagging(true);
    try {
      await api.post(`/helpers/${helperId}/flag`, { reason: flagReason.trim() });
      toast.success(t('local.flagSubmitted'));
      setFlagOpen(false);
      setFlagReason('');
    } catch (err) {
      toast.error(getErrorMessage(err, t));
    } finally {
      setFlagging(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8" aria-label={t('common.loading')}>
        <div className="h-40 animate-pulse rounded-2xl bg-teal-100/60" />
        <div className="h-64 animate-pulse rounded-2xl bg-teal-100/40" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-600">{t('local.notFound')}</p>
        <Link to="/local"><Button variant="outline" className="mt-4">{t('local.backToSearch')}</Button></Link>
      </div>
    );
  }

  const { helper, ratingBreakdown, reviews, viewer } = data;
  const Icon = CATEGORY_ICONS[normalizeLocalCat(helper.categories?.[0])] ?? MapPin;
  const totalRatings = Object.values(ratingBreakdown).reduce((a, b) => a + b, 0);
  const canReview = viewer.hasConnected || viewer.hasBooked;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/local" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('local.backToSearch')}
      </Link>

      <Card className="border-teal-100">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {helper.photoUrl ? (
              <img src={helper.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <Icon className="h-7 w-7" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold text-slate-900">{helper.displayName}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {[helper.serviceLocation?.city, getStateLabel(helper.serviceLocation?.state, i18n.language)].filter(Boolean).join(', ')}
                </span>
                <span>{t('local.experience', { years: helper.experienceYears })}</span>
                <span className="font-bold text-teal-800">
                  {helper.basePricePaise ? formatPaise(helper.basePricePaise, i18n.language) : helper.priceHint}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {helper.categories.map((c) => (
                  <span key={c} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                    {t(`local.categories.${normalizeLocalCat(c)}`)}
                  </span>
                ))}
                {helper.isAvailable ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">{t('local.availableNow')}</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">{t('local.unavailable')}</span>
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">{helper.bio}</p>

          <div className="mt-4">
            <Suspense fallback={<div className="h-[220px] animate-pulse rounded-xl bg-slate-100" />}>
              <HelperAreaMap helper={helper} />
            </Suspense>
          </div>

          <div className="mt-5 border-t border-teal-50 pt-4">
            {viewer.isOwner ? (
              <Link to="/local/dashboard"><Button variant="outline" className="border-teal-200 text-teal-800">{t('local.ownProfile')}</Button></Link>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => setBookOpen(true)}
                    disabled={!helper.isAvailable}
                    className="gap-2 bg-teal-700 text-white hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                    {helper.isAvailable ? t('bookings.bookService') : t('local.unavailable')}
                  </Button>

                  {!contact && (
                    <Button variant="outline" onClick={connect} disabled={connecting} className="gap-2 border-teal-200 text-teal-800">
                      {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : !isAuthenticated ? <LogIn className="h-4 w-4" aria-hidden="true" /> : <Phone className="h-4 w-4" aria-hidden="true" />}
                      {!isAuthenticated ? t('local.loginToConnect') : viewer.hasConnected ? t('local.showContact') : t('local.connect')}
                    </Button>
                  )}
                </div>

                {contact && (
                  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
                    {contact.isSample && (
                      <p className="mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                        {t('local.sampleWarning')}
                      </p>
                    )}
                    <p className="text-lg font-bold tabular-nums text-slate-900">+91 {contact.phone}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={contact.isSample ? undefined : `tel:+91${contact.phone}`}>
                        <Button size="sm" disabled={contact.isSample} className="gap-1.5 bg-teal-700 hover:bg-teal-800">
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" />{t('local.call')}
                        </Button>
                      </a>
                      <a href={contact.whatsappUrl ?? undefined} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" disabled={!contact.whatsappUrl} className="gap-1.5 border-green-300 text-green-700">
                          WhatsApp
                        </Button>
                      </a>
                    </div>
                    <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700">
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {t(contact.safetyNoteKey)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">{t('local.remainingToday', { count: contact.remainingToday })}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <p className="text-3xl font-extrabold tabular-nums text-slate-900">{helper.ratingAvg ? helper.ratingAvg.toFixed(1) : '—'}</p>
            <div>
              <Stars value={helper.ratingAvg} />
              <p className="text-xs text-slate-500">{t('local.reviewsCount', { count: helper.ratingCount })}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-6 tabular-nums">{n}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: totalRatings ? `${(ratingBreakdown[n] / totalRatings) * 100}%` : '0%' }} />
                </div>
                <span className="w-6 text-right tabular-nums">{ratingBreakdown[n]}</span>
              </div>
            ))}
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {reviews.items.map((review) => (
              <li key={review._id} className="py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{review.reviewerName}</p>
                  <Stars value={review.rating} size="h-3 w-3" />
                </div>
                {review.comment && <p className="mt-1 text-sm text-slate-600">{review.comment}</p>}
                <p className="mt-1 text-xs text-slate-400">{formatTxnDate(review.createdAt, i18n.language)}</p>
              </li>
            ))}
            {reviews.items.length === 0 && <p className="py-3 text-sm text-slate-400">{t('local.noReviews')}</p>}
          </ul>
        </CardContent>
      </Card>

      {!viewer.isOwner && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="font-bold text-slate-900">{viewer.myReview ? t('local.editReview') : t('local.rateReview')}</p>
            {canReview ? (
              <form onSubmit={submitReview} className="mt-3 space-y-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                      <Star className={cn('h-7 w-7 transition-colors', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-300')} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder={t('local.commentPlaceholder')}
                  className="field-input"
                />
                <Button type="submit" disabled={!rating || submittingReview} className="gap-2 bg-teal-700 hover:bg-teal-800">
                  {submittingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                  {viewer.myReview ? t('local.updateReview') : t('local.submitReview')}
                </Button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{t('local.connectFirst')}</p>
            )}

            {isAuthenticated && !viewer.hasFlagged && (
              <button type="button" onClick={() => setFlagOpen(true)} className="mt-4 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600">
                <Flag className="h-3 w-3" aria-hidden="true" />
                {t('local.flagHelper')}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      <BookServiceDialog helper={helper} open={bookOpen} onClose={() => setBookOpen(false)} onBooked={() => load()} />

      <Dialog open={flagOpen} onClose={() => setFlagOpen(false)} title={t('local.flagTitle')}>
        <p className="text-sm text-slate-600">{t('local.flagHint')}</p>
        <textarea
          value={flagReason}
          onChange={(e) => setFlagReason(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder={t('local.flagPlaceholder')}
          className="field-input mt-3"
        />
        <Button onClick={submitFlag} disabled={flagReason.trim().length < 5 || flagging} className="mt-3 w-full gap-2 bg-red-600 hover:bg-red-700">
          {flagging && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('local.submitFlag')}
        </Button>
      </Dialog>
    </div>
  );
}

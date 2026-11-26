import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, MapPin, Star, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatPaise } from '@/features/wallet/money';
import { getStateLabel } from '@/lib/indiaLocations';
import { CATEGORY_ICONS, normalizeLocalCat } from './constants';
import BookServiceDialog from './BookServiceDialog';

function distanceLabel(metres) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** Provider card — NEVER exposes phone; offers direct booking and profile view. */
export default function HelperCard({ helper }) {
  const { t, i18n } = useTranslation();
  const [bookOpen, setBookOpen] = useState(false);
  const firstCat = normalizeLocalCat(helper.categories?.[0]);
  const Icon = CATEGORY_ICONS[firstCat] ?? MapPin;
  const stateLabel = getStateLabel(helper.serviceLocation?.state, i18n.language);
  const place = [helper.serviceLocation?.city, stateLabel].filter(Boolean).join(', ');

  return (
    <>
      <article className="surface-card-hover flex flex-col justify-between border-teal-100 p-4">
        <div>
          <Link to={`/local/helpers/${helper._id}`} className="group flex items-start gap-3">
            {helper.photoUrl ? (
              <img src={helper.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" loading="lazy" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900 group-hover:text-teal-700">{helper.displayName}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                {typeof helper.distanceM === 'number' ? (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {distanceLabel(helper.distanceM)}
                  </span>
                ) : place ? (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {place}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {helper.ratingAvg ? helper.ratingAvg.toFixed(1) : '—'} ({helper.ratingCount})
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  {helper.bookingCount ? t('bookings.completedShort', { count: helper.bookingCount }) : t('local.connects', { count: helper.connectCount })}
                </span>
              </p>
            </div>
            {helper.isAvailable ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                {t('local.availableNow')}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {t('local.unavailable')}
              </span>
            )}
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {helper.categories?.map((c) => (
              <span key={c} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
                {t(`local.categories.${normalizeLocalCat(c)}`)}
              </span>
            ))}
            <span className="ml-auto text-xs font-bold tabular-nums text-slate-700">
              {helper.basePricePaise ? formatPaise(helper.basePricePaise, i18n.language) : helper.priceHint}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            size="sm"
            disabled={!helper.isAvailable}
            onClick={() => setBookOpen(true)}
            className="flex-1 gap-1.5 bg-teal-700 text-white hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-500"
          >
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {helper.isAvailable ? t('bookings.bookNow') : t('local.unavailable')}
          </Button>
          <Button asChild type="button" size="sm" variant="outline" className="border-teal-200 text-teal-800 hover:bg-teal-50">
            <Link to={`/local/helpers/${helper._id}`}>{t('common.viewDetails')}</Link>
          </Button>
        </div>
      </article>

      <BookServiceDialog helper={helper} open={bookOpen} onClose={() => setBookOpen(false)} />
    </>
  );
}

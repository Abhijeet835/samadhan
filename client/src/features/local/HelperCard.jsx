import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Star, Users } from 'lucide-react';

import { CATEGORY_ICONS } from './constants';

function distanceLabel(metres) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** Search result card — NEVER shows a phone number. */
export default function HelperCard({ helper }) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[helper.categories?.[0]] ?? MapPin;

  return (
    <Link
      to={`/local/helpers/${helper._id}`}
      className="group block rounded-xl border border-teal-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {helper.photoUrl ? (
          <img src={helper.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 group-hover:text-teal-700">{helper.displayName}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {distanceLabel(helper.distanceM ?? 0)}
            </span>
            <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              {helper.ratingAvg ? helper.ratingAvg.toFixed(1) : '—'} ({helper.ratingCount})
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Users className="h-3 w-3" aria-hidden="true" />
              {t('local.connects', { count: helper.connectCount })}
            </span>
          </p>
        </div>
        {helper.isAvailable && (
          <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 ring-1 ring-green-200">
            {t('local.availableNow')}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {helper.categories?.map((c) => (
          <span key={c} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
            {t(`local.categories.${c}`)}
          </span>
        ))}
        {helper.priceHint && <span className="ml-auto text-xs font-medium text-slate-600">{helper.priceHint}</span>}
      </div>
    </Link>
  );
}

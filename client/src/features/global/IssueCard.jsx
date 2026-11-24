import { Link } from 'react-router-dom';
import { MapPin, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatPaise } from '@/features/wallet/money';
import FundMeter from './FundMeter';
import TierBadge from './TierBadge';
import { CategoryBadge, StatusBadge } from './StatusBadge';

export default function IssueCard({ issue, thresholds }) {
  const { t, i18n } = useTranslation();
  const city = issue.location?.city || issue.location?.address;

  return (
    <Link
      to={`/issues/${issue._id}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {issue.photos?.length > 0 && (
        <div className="h-36 overflow-hidden bg-slate-100">
          <img
            src={issue.photos[0]}
            alt={issue.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={issue.status} />
          <CategoryBadge category={issue.category} />
          <TierBadge tier={issue.tier} />
        </div>
        <h3 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-blue-700">
          {issue.title}
        </h3>
        {city && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate">{city}</span>
          </p>
        )}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatPaise(issue.fundPaise, i18n.language)}
            <span className="ml-1 text-xs font-normal text-slate-500">{t('issues.fundLabel')}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {t('issues.supporters', { count: issue.supporterCount })}
          </span>
        </div>
        <FundMeter compact fundPaise={issue.fundPaise} thresholds={thresholds} />
      </div>
    </Link>
  );
}
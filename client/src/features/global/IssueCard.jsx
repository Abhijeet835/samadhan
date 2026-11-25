import { Link } from 'react-router-dom';
import { CheckCircle2, MapPin, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getStateLabel } from '@/lib/indiaLocations';
import FundMeter from './FundMeter';
import TierBadge from './TierBadge';
import { CategoryBadge, ImportanceBadge, IssueTypeBadge, StatusBadge } from './StatusBadge';

export default function IssueCard({ issue }) {
  const { t, i18n } = useTranslation();
  const stateLabel = getStateLabel(issue.location?.state, i18n.language);
  const place = [issue.location?.city, stateLabel].filter(Boolean).join(', ') || issue.location?.address;
  const solver = issue.resolution?.organizationName;

  return (
    <Link
      to={`/issues/${issue._id}`}
      className="surface-card-hover group block overflow-hidden"
    >
      {issue.photos?.length > 0 && (
        <div className="h-36 overflow-hidden bg-slate-100">
          <img
            src={issue.photos[0]}
            alt={issue.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={issue.status} />
          <IssueTypeBadge issueType={issue.issueType} />
          <ImportanceBadge importance={issue.importance} />
          <TierBadge explosionTriggered={issue.explosionTriggered} issueType={issue.issueType} />
        </div>

        <h3 className="line-clamp-2 font-bold text-slate-900 group-hover:text-primary">
          {issue.title}
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <CategoryBadge category={issue.category} />
          {place && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{place}</span>
            </span>
          )}
        </div>

        <FundMeter compact issue={issue} />

        {solver ? (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{t('resolution.solvedByInline', { org: solver })}</span>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {t('issues.supporters', { count: issue.supporterCount ?? 0 })}
            </span>
            <span className="font-semibold text-primary group-hover:underline">{t('common.viewDetails')}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

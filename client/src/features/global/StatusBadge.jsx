import { useTranslation } from 'react-i18next';
import { Flame, HandCoins } from 'lucide-react';

import { cn } from '@/lib/utils';
import { normalizeCategoryKey } from './constants';

const STATUS_STYLES = {
  ACTIVE: 'bg-blue-100 text-blue-700',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-slate-200 text-slate-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const IMPORTANCE_STYLES = {
  SMALL: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  LARGE: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

export function StatusBadge({ status, className }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600',
        className,
      )}
    >
      {t(`issues.statuses.${status}`)}
    </span>
  );
}

export function CategoryBadge({ category, className }) {
  const { t } = useTranslation();
  const key = normalizeCategoryKey(category);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700',
        className,
      )}
    >
      {t(`issues.categories.${key}`)}
    </span>
  );
}

export function IssueTypeBadge({ issueType = 'SOCIAL_EXPLOSION', className }) {
  const { t } = useTranslation();
  const isPool = issueType === 'POOL_FUNDS';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isPool ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200' : 'bg-orange-50 text-orange-800 ring-1 ring-orange-200',
        className,
      )}
    >
      {isPool ? <HandCoins className="h-3 w-3" aria-hidden="true" /> : <Flame className="h-3 w-3" aria-hidden="true" />}
      {t(`issues.types.${issueType}`)}
    </span>
  );
}

export function ImportanceBadge({ importance = 'MEDIUM', className }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        IMPORTANCE_STYLES[importance] ?? IMPORTANCE_STYLES.MEDIUM,
        className,
      )}
    >
      {t(`issues.importance.${importance}`)}
    </span>
  );
}

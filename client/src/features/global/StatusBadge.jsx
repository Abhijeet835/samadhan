import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  ACTIVE: 'bg-blue-100 text-blue-700',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-200 text-slate-600',
  REJECTED: 'bg-red-100 text-red-700',
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
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600',
        className,
      )}
    >
      {t(`issues.categories.${category}`)}
    </span>
  );
}
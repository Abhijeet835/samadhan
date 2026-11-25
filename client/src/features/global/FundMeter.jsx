import { useTranslation } from 'react-i18next';
import { CheckCircle2, Flame, Sparkles, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatPaise } from '@/features/wallet/money';

/**
 * Dynamic importance-based threshold meter:
 * - SOCIAL_EXPLOSION: tracks supporters vs SMALL/MEDIUM/LARGE target
 * - POOL_FUNDS: tracks pooled funds vs fundingGoalPaise target
 */
export default function FundMeter({ issue, compact = false }) {
  const { t, i18n } = useTranslation();
  if (!issue) return null;

  const isPool = issue.issueType === 'POOL_FUNDS';
  const target = isPool
    ? Math.max(100, issue.fundingGoalPaise || issue.thresholdTarget || 50000)
    : Math.max(1, issue.thresholdTarget || 15);
  const current = isPool ? (issue.fundPaise || 0) : (issue.supporterCount || 0);
  const pct = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);
  const reached = !!issue.explosionTriggered || current >= target;
  const resolved = ['RESOLVED', 'CLOSED'].includes(issue.status);

  if (compact) {
    return (
      <div className="mt-2.5">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              reached
                ? 'bg-emerald-500'
                : isPool
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                  : 'bg-gradient-to-r from-blue-500 to-orange-500',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>
            {isPool
              ? t('meter.poolCompact', { raised: formatPaise(current, i18n.language), goal: formatPaise(target, i18n.language) })
              : t('meter.explosionCompact', { count: current, target })}
          </span>
          <span className={cn('font-bold', reached ? 'text-emerald-700' : 'text-slate-600')}>{pct}%</span>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">
          {isPool ? t('meter.poolRaisedLabel') : t('meter.supportProgressLabel')}
        </p>
        <p className="text-2xl font-extrabold tabular-nums text-slate-900">
          {isPool ? formatPaise(current, i18n.language) : `${current} / ${target}`}
        </p>
      </div>

      <div
        className="relative mt-3 h-3 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(current, target)}
        aria-label={t('meter.aria')}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            reached
              ? 'bg-emerald-500'
              : isPool
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                : 'bg-gradient-to-r from-blue-600 to-orange-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{t('meter.percentComplete', { pct })}</span>
        <span>
          {isPool
            ? t('meter.goalLabel', { goal: formatPaise(target, i18n.language) })
            : t('meter.thresholdLabel', { target, level: t(`issues.importance.${issue.importance || 'MEDIUM'}`) })}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-800">
        {resolved ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t('meter.resolvedSuccess')}
          </span>
        ) : reached ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {isPool ? t('meter.goalReachedMsg') : t('meter.explosionReachedMsg')}
          </span>
        ) : isPool ? (
          t('meter.poolRemaining', { remaining: formatPaise(remaining, i18n.language) })
        ) : (
          t('meter.supportersRemaining', { remaining })
        )}
      </p>

      {reached && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800 ring-1 ring-orange-200">
          {isPool ? <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> : <Flame className="h-3.5 w-3.5" aria-hidden="true" />}
          {isPool ? t('meter.goalReachedShort') : t('meter.explosionTriggeredShort')}
        </p>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        {t('issues.supporters', { count: issue.supporterCount ?? 0 })}
      </p>

      <p className="mt-2 text-[11px] leading-snug text-slate-400">{t('escalation.notOfficial')}</p>
    </div>
  );
}

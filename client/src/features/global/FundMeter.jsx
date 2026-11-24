import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatPaise } from '@/features/wallet/money';

/**
 * Progress toward the Tier 1 / Tier 2 thresholds (from /issues/meta).
 * Shows "threshold reached" states only — launching campaigns is Phase 5.
 */
export default function FundMeter({ fundPaise, supporterCount, thresholds, compact = false }) {
  const { t, i18n } = useTranslation();
  if (!thresholds) return null;

  const { tier1Paise, tier2Paise } = thresholds;
  const pct = Math.min(100, (fundPaise / tier2Paise) * 100);
  const tier1Pct = Math.min(100, (tier1Paise / tier2Paise) * 100);
  const tier1Reached = fundPaise >= tier1Paise;
  const tier2Reached = fundPaise >= tier2Paise;

  if (compact) {
    return (
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
        <div className="absolute top-0 h-full w-px bg-slate-400/70" style={{ left: `${tier1Pct}%` }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{t('issues.fundLabel')}</p>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">
          {formatPaise(fundPaise, i18n.language)}
        </p>
      </div>

      <div
        className="relative mt-3 h-2.5 rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={tier2Paise}
        aria-valuenow={Math.min(fundPaise, tier2Paise)}
        aria-label={t('meter.aria')}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
        <div
          className={cn('absolute -top-1 h-4.5 w-0.5 rounded', tier1Reached ? 'bg-amber-500' : 'bg-slate-300')}
          style={{ left: `${tier1Pct}%`, height: '1.125rem' }}
          aria-hidden="true"
        />
        <div
          className={cn('absolute -top-1 w-0.5 rounded', tier2Reached ? 'bg-emerald-600' : 'bg-slate-300')}
          style={{ left: 'calc(100% - 2px)', height: '1.125rem' }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] font-medium">
        <span className={cn('flex items-center gap-1', tier1Reached ? 'text-amber-600' : 'text-slate-400')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', tier1Reached ? 'bg-amber-500' : 'bg-slate-300')} />
          {t('meter.tier1', { amount: formatPaise(tier1Paise, i18n.language) })}
        </span>
        <span className={cn('flex items-center gap-1', tier2Reached ? 'text-emerald-600' : 'text-slate-400')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', tier2Reached ? 'bg-emerald-500' : 'bg-slate-300')} />
          {t('meter.tier2', { amount: formatPaise(tier2Paise, i18n.language) })}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-slate-700">
        {tier2Reached
          ? t('meter.bothReached')
          : tier1Reached
            ? t('meter.tier1Reached')
            : t('meter.progress', {
                raised: formatPaise(fundPaise, i18n.language),
                target: formatPaise(tier1Paise, i18n.language),
              })}
      </p>

      {typeof supporterCount === 'number' && (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
          <Users className="h-4 w-4" aria-hidden="true" />
          {t('issues.supporters', { count: supporterCount })}
        </p>
      )}
    </div>
  );
}

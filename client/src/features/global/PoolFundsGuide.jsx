import { useTranslation } from 'react-i18next';
import { CheckCircle2, HandCoins, Info, Receipt, RotateCcw, Target } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { formatPaise } from '@/features/wallet/money';

/**
 * Plain-language explanation of a Pool Fund: what the money is for, when it
 * gets spent, how spending is proven, and what happens if the issue is rejected.
 * Shown only on POOL_FUNDS issues, above the itemized utilization card.
 */
export default function PoolFundsGuide({ issue }) {
  const { t, i18n } = useTranslation();
  if (issue?.issueType !== 'POOL_FUNDS') return null;

  const goal = Math.max(100, issue.fundingGoalPaise || issue.thresholdTarget || 50000);
  const raised = issue.fundPaise || 0;
  const spent = (issue.fundUtilization ?? []).reduce((sum, row) => sum + (row.amountPaise || 0), 0);
  const remaining = Math.max(0, raised - spent);
  const refunded = issue.status === 'REJECTED';
  const goalReached = Boolean(issue.explosionTriggered) || raised >= goal;

  const statusLine = refunded
    ? t('pool.guideStatusRefunded')
    : goalReached
      ? t('pool.guideStatusGoal')
      : spent > 0
        ? t('pool.guideStatusSpending')
        : t('pool.guideStatusOpen');

  const steps = [
    {
      icon: HandCoins,
      title: t('pool.guideStep1Title'),
      text: t('pool.guideStep1Text'),
    },
    {
      icon: Target,
      title: t('pool.guideStep2Title'),
      text: t('pool.guideStep2Text', { goal: formatPaise(goal, i18n.language) }),
    },
    {
      icon: Receipt,
      title: t('pool.guideStep3Title'),
      text: t('pool.guideStep3Text'),
    },
  ];

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50/70 to-white">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
            <HandCoins className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{t('pool.guideTitle')}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{t('pool.guideSubtitle')}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: t('pool.guideGoal'), value: goal },
            { label: t('pool.guideRaised'), value: raised },
            { label: t('pool.guideSpent'), value: spent },
            { label: t('pool.guideRemaining'), value: remaining },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-teal-100 bg-white/80 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-0.5 text-sm font-extrabold tabular-nums text-slate-900">{formatPaise(value, i18n.language)}</p>
            </div>
          ))}
        </div>

        <p
          className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
            refunded
              ? 'bg-amber-50 text-amber-800'
              : goalReached
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-teal-50 text-teal-800'
          }`}
        >
          {goalReached && !refunded ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Info className="h-3.5 w-3.5" aria-hidden="true" />}
          {statusLine}
        </p>

        <ol className="mt-4 grid gap-2.5 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-[11px] font-extrabold text-teal-800">
                  {index + 1}
                </span>
                <Icon className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                <p className="text-xs font-bold text-slate-900">{title}</p>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-slate-600">{text}</p>
            </li>
          ))}
        </ol>

        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-500">
          <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('pool.guideRefund')}
        </p>
        <p className="mt-1.5 text-[10px] text-slate-400">{t('pool.guideSimulated')}</p>
      </CardContent>
    </Card>
  );
}

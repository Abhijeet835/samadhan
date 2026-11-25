import { useTranslation } from 'react-i18next';
import { Flame, Sparkles } from 'lucide-react';

/** Displays when a Social Explosion or Pool Funds threshold has been triggered. */
export default function TierBadge({ explosionTriggered, issueType = 'SOCIAL_EXPLOSION' }) {
  const { t } = useTranslation();
  if (!explosionTriggered) return null;

  const isPool = issueType === 'POOL_FUNDS';
  return (
    <span
      className={
        isPool
          ? 'inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800'
          : 'inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-800 ring-1 ring-orange-200'
      }
    >
      {isPool ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : <Flame className="h-3 w-3" aria-hidden="true" />}
      {isPool ? t('meter.goalReachedShort') : t('meter.explosionTriggeredShort')}
    </span>
  );
}

import { useTranslation } from 'react-i18next';
import { Send, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

export default function TierBadge({ tier, className }) {
  const { t } = useTranslation();
  if (!tier || tier < 1) return null;

  const escalated = tier >= 2;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        escalated
          ? 'bg-gradient-to-r from-violet-100 to-blue-100 text-violet-700 ring-1 ring-violet-200'
          : 'bg-gradient-to-r from-amber-100 to-yellow-50 text-amber-700 ring-1 ring-amber-200',
        className,
      )}
    >
      {escalated ? <Send className="h-3 w-3" aria-hidden="true" /> : <Sparkles className="h-3 w-3" aria-hidden="true" />}
      {escalated ? t('tier.escalated') : t('tier.spotlight')}
    </span>
  );
}

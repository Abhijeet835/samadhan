import { Globe, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

export default function ModeBadge({ className }) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'hidden items-center rounded-full border border-border bg-card/80 p-1 shadow-sm lg:flex',
        className,
      )}
      role="img"
      aria-label={t('nav.modeBadge')}
      title={t('nav.modeBadge')}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
        <Globe className="h-3 w-3" aria-hidden="true" />
        {t('nav.global')}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-helper">
        <MapPin className="h-3 w-3" aria-hidden="true" />
        {t('nav.local')}
      </span>
    </div>
  );
}

import { Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export default function Logo({ className }) {
  const { t } = useTranslation();

  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5 rounded-lg', className)}
      aria-label={t('app.name')}
    >
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-civic-indigo via-civic-indigo to-helper text-white shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
        <Landmark className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-civic-amber/90 blur-[2px]" />
      </span>
      <span className="hidden text-lg font-extrabold tracking-tight sm:inline">{t('app.name')}</span>
    </Link>
  );
}

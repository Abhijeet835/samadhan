import { useTranslation } from 'react-i18next';

import LanguageToggle from '@/components/LanguageToggle';
import Logo from '@/components/Logo';
import ModeBadge from '@/components/ModeBadge';

export default function Navbar() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label={t('nav.main')}>
          <a
            href="#how-it-works"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t('nav.howItWorks')}
          </a>
          <a
            href="#modes"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t('nav.modes')}
          </a>
          <a
            href="#trust"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t('trust.eyebrow')}
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ModeBadge />
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}

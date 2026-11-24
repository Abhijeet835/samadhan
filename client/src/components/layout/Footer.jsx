import { useTranslation } from 'react-i18next';

import Logo from '@/components/Logo';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-card/50 pb-28 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">{t('footer.tagline')}</p>
          </div>

          <nav className="flex flex-col gap-2 text-sm" aria-label={t('nav.main')}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t('footer.explore')}
            </p>
            <a href="/#how-it-works" className="text-muted-foreground transition-colors hover:text-foreground">
              {t('nav.howItWorks')}
            </a>
            <a href="/#modes" className="text-muted-foreground transition-colors hover:text-foreground">
              {t('nav.modes')}
            </a>
            <a href="/#trust" className="text-muted-foreground transition-colors hover:text-foreground">
              {t('trust.eyebrow')}
            </a>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.copyright', { year })}</p>
          <p>{t('footer.simulated')}</p>
        </div>
      </div>
    </footer>
  );
}

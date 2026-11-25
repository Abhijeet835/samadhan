import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Logo from '@/components/Logo';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/70 bg-card/60 pb-24 xl:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">{t('footer.tagline')}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <nav className="flex flex-col gap-2" aria-label={t('nav.global')}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t('nav.global')}
              </p>
              <Link to="/issues" className="text-muted-foreground transition-colors hover:text-foreground">
                {t('nav.feed')}
              </Link>
              <Link to="/states" className="text-muted-foreground transition-colors hover:text-foreground">
                {t('nav.states')}
              </Link>
              <Link to="/report" className="text-muted-foreground transition-colors hover:text-foreground">
                {t('nav.report')}
              </Link>
            </nav>
            <nav className="flex flex-col gap-2" aria-label={t('nav.local')}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t('nav.local')}
              </p>
              <Link to="/local" className="text-muted-foreground transition-colors hover:text-foreground">
                {t('nav.localServices')}
              </Link>
              <Link to="/local/register" className="text-muted-foreground transition-colors hover:text-foreground">
                {t('local.registerCta')}
              </Link>
              <Link to="/my-activity" className="text-muted-foreground transition-colors hover:text-foreground">
                {t('nav.myActivity')}
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.copyright', { year })}</p>
          <p>{t('footer.simulated')}</p>
        </div>
      </div>
    </footer>
  );
}

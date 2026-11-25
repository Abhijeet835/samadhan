import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet } from 'lucide-react';

import LanguageToggle from '@/components/LanguageToggle';
import Logo from '@/components/Logo';
import ModeSwitch from '@/components/ModeSwitch';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label={t('nav.main')}>
          <Link
            to="/issues"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t('nav.feed')}
          </Link>
          <Link
            to="/trending"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t('nav.trending')}
          </Link>
          <Link
            to="/local"
            className="rounded-lg px-3 py-2 text-sm font-medium text-teal-700 transition-colors hover:bg-teal-50 hover:text-teal-800"
          >
            {t('nav.localServices')}
          </Link>
          <Link
            to="/report"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t('nav.report')}
          </Link>
          {isAuthenticated && (
            <Link
              to="/my-activity"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t('nav.myActivity')}
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <>
              <Link
                to="/admin/dispatch"
                className="rounded-lg px-3 py-2 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
              >
                {t('nav.adminDispatch')}
              </Link>
              <Link
                to="/admin/social"
                className="rounded-lg px-3 py-2 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
              >
                {t('nav.adminSocial')}
              </Link>
              <Link
                to="/admin/helpers"
                className="rounded-lg px-3 py-2 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
              >
                {t('nav.adminHelpers')}
              </Link>
            </>
          )}
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
          <ModeSwitch />
          <LanguageToggle />
          
          {isAuthenticated ? (
            <>
              <Link to="/wallet">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                  {t('nav.wallet')}
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline" size="sm">
                  {user?.name || t('nav.profile')}
                </Button>
              </Link>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">
                  {t('nav.register')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

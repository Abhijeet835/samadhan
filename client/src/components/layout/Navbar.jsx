import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, LogOut, Shield, User, Wallet } from 'lucide-react';

import LanguageToggle from '@/components/LanguageToggle';
import Logo from '@/components/Logo';
import ModeSwitch from '@/components/ModeSwitch';
import NotificationBell from '@/features/notifications/NotificationBell';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const navLinkClass = (active, tone = 'blue') =>
    cn(
      'rounded-lg px-2 py-1.5 text-xs xl:px-2.5 xl:text-[13px] font-semibold transition-colors whitespace-nowrap',
      active
        ? tone === 'teal'
          ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
          : tone === 'violet'
            ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
            : 'bg-primary/10 text-primary ring-1 ring-primary/20'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-5 lg:px-6">
        <Logo className="shrink-0" />

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label={t('nav.main')}>
          <Link to="/issues" className={navLinkClass(pathname === '/issues' || pathname.startsWith('/issues/'))}>
            {t('nav.feed')}
          </Link>
          <Link to="/states" className={navLinkClass(pathname.startsWith('/states'))}>
            {t('nav.states')}
          </Link>
          <Link
            to="/local"
            className={navLinkClass(
              pathname === '/local' || pathname.startsWith('/local/search') || pathname.startsWith('/local/helpers'),
              'teal',
            )}
          >
            {t('nav.localServices')}
          </Link>
          <Link to="/report" className={navLinkClass(pathname === '/report')}>
            {t('nav.report')}
          </Link>
          {isAuthenticated && (user?.role === 'PROVIDER' || user?.hasHelperProfile) && (
            <Link to="/local/dashboard" className={navLinkClass(pathname === '/local/dashboard', 'teal')}>
              {t('nav.providerHub')}
            </Link>
          )}
          {isAuthenticated && (
            <Link to="/my-activity" className={navLinkClass(pathname === '/my-activity')}>
              {t('nav.myActivity')}
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className={navLinkClass(pathname.startsWith('/admin'), 'violet')}>
              {t('nav.admin')}
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ModeSwitch />
          <LanguageToggle />
          {isAuthenticated && <NotificationBell />}

          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              <Button asChild variant={pathname === '/wallet' ? 'secondary' : 'ghost'} size="sm" className="hidden gap-1.5 px-2 sm:inline-flex 2xl:px-3" aria-label={t('nav.wallet')} title={t('nav.wallet')}>
                <Link to="/wallet">
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden 2xl:inline">{t('nav.wallet')}</span>
                </Link>
              </Button>
              {(user?.role === 'PROVIDER' || user?.hasHelperProfile) && (
                <Button asChild variant="ghost" size="sm" className="xl:hidden" aria-label={t('nav.providerHub')}>
                  <Link to="/local/dashboard">
                    <Briefcase className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  </Link>
                </Button>
              )}
              {user?.role === 'ADMIN' && (
                <Button asChild variant="ghost" size="sm" className="xl:hidden" aria-label={t('nav.admin')}>
                  <Link to="/admin">
                    <Shield className="h-4 w-4 text-violet-600" aria-hidden="true" />
                  </Link>
                </Button>
              )}
              <Button asChild variant={pathname === '/profile' ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 px-2 2xl:px-3" aria-label={t('nav.profile')} title={user?.name || t('nav.profile')}>
                <Link to="/profile">
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden max-w-[96px] truncate 2xl:inline">{user?.name}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} aria-label={t('auth.logout')} title={t('auth.logout')}>
                <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
                <Link to="/login">{t('nav.login')}</Link>
              </Button>
              <Button asChild size="sm" className="hidden px-3 sm:inline-flex">
                <Link to="/register">{t('nav.register')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import { Activity, Home, List, Megaphone, Search, ShieldCheck, Wallet, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const itemClass =
  'flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center text-[10px] font-medium leading-tight text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isLocal = location.pathname.startsWith('/local');

  const active = (match) => match && 'bg-primary/10 text-primary';

  if (isLocal) {
    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-teal-100 bg-background/95 backdrop-blur-xl md:hidden"
        aria-label={t('nav.mobile')}
      >
        <div
          className={cn(
            'mx-auto grid max-w-md gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5',
            isAuthenticated ? 'grid-cols-5' : 'grid-cols-3',
          )}
        >
          <Link to="/local" className={cn(itemClass, active(location.pathname === '/local'))}>
            <Wrench className="h-5 w-5" aria-hidden="true" />
            <span className="w-full truncate">{t('nav.localServices')}</span>
          </Link>
          <Link to="/local/search" className={cn(itemClass, active(location.pathname === '/local/search'))}>
            <Search className="h-5 w-5" aria-hidden="true" />
            <span className="w-full truncate">{t('nav.localSearch')}</span>
          </Link>
          <Link to="/local/dashboard" className={cn(itemClass, active(location.pathname === '/local/dashboard'))}>
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <span className="w-full truncate">{t('nav.localDashboard')}</span>
          </Link>
          {isAuthenticated && (
            <Link to="/my-activity" className={cn(itemClass, active(location.pathname === '/my-activity'))}>
              <Activity className="h-5 w-5" aria-hidden="true" />
              <span className="w-full truncate">{t('nav.myActivity')}</span>
            </Link>
          )}
          {isAuthenticated && (
            <Link to="/wallet" className={cn(itemClass, active(location.pathname === '/wallet'))}>
              <Wallet className="h-5 w-5" aria-hidden="true" />
              <span className="w-full truncate">{t('nav.wallet')}</span>
            </Link>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-xl md:hidden"
      aria-label={t('nav.mobile')}
    >
      <div
        className={cn(
          'mx-auto grid max-w-md gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5',
          isAuthenticated ? 'grid-cols-5' : 'grid-cols-3',
        )}
      >
        <Link to="/" className={cn(itemClass, active(location.pathname === '/'))}>
          <Home className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.home')}</span>
        </Link>
        <Link to="/issues" className={cn(itemClass, active(location.pathname.startsWith('/issues')))}>
          <List className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.feed')}</span>
        </Link>
        <Link to="/report" className={cn(itemClass, active(location.pathname === '/report'))}>
          <Megaphone className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.report')}</span>
        </Link>
        {isAuthenticated && (
          <Link to="/my-activity" className={cn(itemClass, active(location.pathname === '/my-activity'))}>
            <Activity className="h-5 w-5" aria-hidden="true" />
            <span className="w-full truncate">{t('nav.myActivity')}</span>
          </Link>
        )}
        {isAuthenticated && (
          <Link to="/wallet" className={cn(itemClass, active(location.pathname === '/wallet'))}>
            <Wallet className="h-5 w-5" aria-hidden="true" />
            <span className="w-full truncate">{t('nav.wallet')}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

import { Activity, Home, List, Megaphone, Wallet } from 'lucide-react';
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
        <Link
          to="/"
          className={cn(itemClass, location.pathname === '/' && 'bg-primary/10 text-primary')}
          aria-current={location.pathname === '/' ? 'page' : undefined}
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.home')}</span>
        </Link>

        <Link
          to="/issues"
          className={cn(itemClass, location.pathname.startsWith('/issues') && 'bg-primary/10 text-primary')}
          aria-current={location.pathname.startsWith('/issues') ? 'page' : undefined}
        >
          <List className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.feed')}</span>
        </Link>

        <Link
          to="/report"
          className={cn(itemClass, location.pathname === '/report' && 'bg-primary/10 text-primary')}
          aria-current={location.pathname === '/report' ? 'page' : undefined}
        >
          <Megaphone className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.report')}</span>
        </Link>

        {isAuthenticated && (
          <Link
            to="/my-activity"
            className={cn(itemClass, location.pathname === '/my-activity' && 'bg-primary/10 text-primary')}
            aria-current={location.pathname === '/my-activity' ? 'page' : undefined}
          >
            <Activity className="h-5 w-5" aria-hidden="true" />
            <span className="w-full truncate">{t('nav.myActivity')}</span>
          </Link>
        )}

        {isAuthenticated && (
          <Link
            to="/wallet"
            className={cn(itemClass, location.pathname === '/wallet' && 'bg-primary/10 text-primary')}
            aria-current={location.pathname === '/wallet' ? 'page' : undefined}
          >
            <Wallet className="h-5 w-5" aria-hidden="true" />
            <span className="w-full truncate">{t('nav.wallet')}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

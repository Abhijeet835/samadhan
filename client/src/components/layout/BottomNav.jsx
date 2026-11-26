import { Activity, Briefcase, Globe, List, MapPin, Megaphone, Store, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const itemClass =
  'flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center text-[10px] font-semibold leading-tight text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const isLocal = location.pathname.startsWith('/local');

  const active = (match, tone = 'blue') =>
    match && (tone === 'teal' ? 'bg-teal-50 text-teal-800' : 'bg-primary/10 text-primary');

  if (isLocal) {
    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-teal-100 bg-background/95 backdrop-blur-xl xl:hidden"
        aria-label={t('nav.mobile')}
      >
        <div
          className={cn(
            'mx-auto grid max-w-md gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5',
            isAuthenticated ? 'grid-cols-4' : 'grid-cols-2',
          )}
        >
          <Link
            to="/local"
            className={cn(
              itemClass,
              active(
                location.pathname === '/local' ||
                  location.pathname.startsWith('/local/search') ||
                  location.pathname.startsWith('/local/helpers'),
                'teal',
              ),
            )}
          >
            <Store className="h-5 w-5" aria-hidden="true" />
            <span className="w-full truncate">{t('nav.localServices')}</span>
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to={user?.role === 'PROVIDER' || user?.hasHelperProfile ? '/local/dashboard' : '/my-activity'}
                className={cn(itemClass, active(location.pathname === '/local/dashboard' || location.pathname === '/my-activity', 'teal'))}
              >
                {user?.role === 'PROVIDER' || user?.hasHelperProfile ? <Briefcase className="h-5 w-5" aria-hidden="true" /> : <Activity className="h-5 w-5" aria-hidden="true" />}
                <span className="w-full truncate">{user?.role === 'PROVIDER' || user?.hasHelperProfile ? t('nav.providerHub') : t('nav.myActivity')}</span>
              </Link>
              <Link to="/wallet" className={cn(itemClass, active(location.pathname === '/wallet', 'teal'))}>
                <Wallet className="h-5 w-5" aria-hidden="true" />
                <span className="w-full truncate">{t('nav.wallet')}</span>
              </Link>
              <Link to="/issues" className={itemClass}>
                <Globe className="h-5 w-5" aria-hidden="true" />
                <span className="w-full truncate">{t('nav.global')}</span>
              </Link>
            </>
          ) : (
            <Link to="/issues" className={itemClass}>
              <Globe className="h-5 w-5" aria-hidden="true" />
              <span className="w-full truncate">{t('nav.global')}</span>
            </Link>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-xl xl:hidden"
      aria-label={t('nav.mobile')}
    >
      <div
        className={cn(
          'mx-auto grid max-w-md gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5',
          isAuthenticated ? 'grid-cols-5' : 'grid-cols-4',
        )}
      >
        <Link to="/issues" className={cn(itemClass, active(location.pathname.startsWith('/issues')))}>
          <List className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.feed')}</span>
        </Link>
        <Link to="/states" className={cn(itemClass, active(location.pathname.startsWith('/states')))}>
          <MapPin className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.states')}</span>
        </Link>
        <Link to="/report" className={cn(itemClass, active(location.pathname === '/report'))}>
          <Megaphone className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.report')}</span>
        </Link>
        {isAuthenticated ? (
          <>
            <Link to="/my-activity" className={cn(itemClass, active(location.pathname === '/my-activity'))}>
              <Activity className="h-5 w-5" aria-hidden="true" />
              <span className="w-full truncate">{t('nav.myActivity')}</span>
            </Link>
            <Link to="/wallet" className={cn(itemClass, active(location.pathname === '/wallet'))}>
              <Wallet className="h-5 w-5" aria-hidden="true" />
              <span className="w-full truncate">{t('nav.wallet')}</span>
            </Link>
          </>
        ) : (
          <Link to="/local" className={itemClass}>
            <Store className="h-5 w-5" aria-hidden="true" />
            <span className="w-full truncate">{t('nav.local')}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

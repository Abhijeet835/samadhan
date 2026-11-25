import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Globe, Store } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { MODE_KEY } from '@/features/local/constants';

/**
 * Global | Local segmented switch. Stays synced with current route AND
 * localStorage; syncs to backend profile when logged in.
 */
export default function ModeSwitch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, switchMode } = useAuth();

  const routeIsLocal = location.pathname.startsWith('/local');
  const routeIsGlobal = ['/issues', '/report', '/states', '/map', '/trending'].some((p) =>
    location.pathname.startsWith(p),
  );

  const [mode, setMode] = useState(() =>
    localStorage.getItem(MODE_KEY) === 'LOCAL' ? 'LOCAL' : 'GLOBAL',
  );

  useEffect(() => {
    if (routeIsLocal && mode !== 'LOCAL') {
      setMode('LOCAL');
      localStorage.setItem(MODE_KEY, 'LOCAL');
    } else if (routeIsGlobal && mode !== 'GLOBAL') {
      setMode('GLOBAL');
      localStorage.setItem(MODE_KEY, 'GLOBAL');
    }
  }, [routeIsLocal, routeIsGlobal, mode]);

  function choose(next) {
    setMode(next);
    localStorage.setItem(MODE_KEY, next);
    if (isAuthenticated) switchMode(next).catch(() => {});
    navigate(next === 'LOCAL' ? '/local' : '/issues');
  }

  return (
    <div className="flex rounded-full border border-border/80 bg-muted/60 p-0.5" role="group" aria-label={t('nav.modes')}>
      <button
        type="button"
        onClick={() => choose('GLOBAL')}
        aria-pressed={mode === 'GLOBAL'}
        className={cn(
          'flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-all sm:px-2.5 sm:text-xs',
          mode === 'GLOBAL' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t('nav.global')}</span>
      </button>
      <button
        type="button"
        onClick={() => choose('LOCAL')}
        aria-pressed={mode === 'LOCAL'}
        className={cn(
          'flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition-all sm:px-2.5 sm:text-xs',
          mode === 'LOCAL' ? 'bg-teal-700 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Store className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t('nav.local')}</span>
      </button>
    </div>
  );
}

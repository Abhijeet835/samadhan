import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Globe, MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { MODE_KEY } from '@/features/local/constants';

/**
 * Global | Local segmented switch. Choice persists in localStorage; syncs to
 * the profile via POST /auth/switch-mode ONLY when logged in (override #10).
 */
export default function ModeSwitch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, switchMode } = useAuth();
  const mode = localStorage.getItem(MODE_KEY) === 'LOCAL' ? 'LOCAL' : 'GLOBAL';

  function choose(next) {
    if (next === mode) return;
    localStorage.setItem(MODE_KEY, next);
    if (isAuthenticated) switchMode(next).catch(() => {});
    navigate(next === 'LOCAL' ? '/local' : '/issues');
  }

  return (
    <div className="flex rounded-full border border-border/70 bg-muted/50 p-0.5" role="group" aria-label={t('nav.modes')}>
      <button
        type="button"
        onClick={() => choose('GLOBAL')}
        aria-pressed={mode === 'GLOBAL'}
        className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
          mode === 'GLOBAL' ? 'bg-blue-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        {t('nav.global')}
      </button>
      <button
        type="button"
        onClick={() => choose('LOCAL')}
        aria-pressed={mode === 'LOCAL'}
        className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
          mode === 'LOCAL' ? 'bg-teal-700 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        {t('nav.local')}
      </button>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import api from '@/lib/api';
import { cn } from '@/lib/utils';

const TONES = {
  checking: {
    container: 'border-border bg-muted/70 text-muted-foreground',
    dot: 'bg-muted-foreground',
    Icon: Wifi,
  },
  online: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
    Icon: Wifi,
  },
  degraded: {
    container: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
    Icon: Wifi,
  },
  offline: {
    container: 'border-rose-200 bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
    Icon: WifiOff,
  },
};

export default function HealthBadge({ className }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('checking');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMounted = useRef(true);

  const checkHealth = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const response = await api.get('/health');
      const payload = response.data;

      if (!isMounted.current) return;

      if (payload?.success && payload.data?.status === 'ok') {
        setStatus(payload.data.db === 'connected' ? 'online' : 'degraded');
      } else {
        setStatus('offline');
      }
    } catch {
      if (isMounted.current) {
        setStatus('offline');
      }
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    checkHealth();

    const intervalId = window.setInterval(checkHealth, 30_000);

    return () => {
      isMounted.current = false;
      window.clearInterval(intervalId);
    };
  }, [checkHealth]);

  const tone = TONES[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm',
        tone.container,
        className,
      )}
      title={t('health.label')}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {status === 'online' || status === 'degraded' ? (
          <span
            className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-50', tone.dot)}
          />
        ) : null}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', tone.dot)} />
      </span>
      <tone.Icon className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
      <span role="status" aria-live="polite">
        {t(`health.${status}`)}
      </span>
      <button
        type="button"
        onClick={checkHealth}
        disabled={isRefreshing}
        aria-label={t('health.retry')}
        title={t('health.retry')}
        className="ml-0.5 rounded-full p-1 transition-colors hover:bg-black/5 disabled:opacity-50"
      >
        <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} aria-hidden="true" />
      </button>
    </div>
  );
}

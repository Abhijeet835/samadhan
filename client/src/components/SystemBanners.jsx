import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { applySwUpdate, isSwUpdateAvailable } from '@/lib/swUpdate';

/** Offline + cold-start "waking" + PWA update banners. All i18n, aria-live. */
export default function SystemBanners() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const [waking, setWaking] = useState(false);
  const [updateReady, setUpdateReady] = useState(() => isSwUpdateAvailable());
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    const wake = () => setWaking(true);
    const settled = () => setWaking(false);
    const update = () => {
      setUpdating(false);
      setUpdateReady(true);
    };
    const cleared = () => setUpdateReady(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('samadhan:waking', wake);
    window.addEventListener('samadhan:settled', settled);
    window.addEventListener('samadhan:sw-update', update);
    window.addEventListener('samadhan:sw-update-cleared', cleared);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('samadhan:waking', wake);
      window.removeEventListener('samadhan:settled', settled);
      window.removeEventListener('samadhan:sw-update', update);
      window.removeEventListener('samadhan:sw-update-cleared', cleared);
    };
  }, []);

  async function handleRefresh() {
    if (updating) return;
    setUpdating(true);
    await applySwUpdate();
  }

  return (
    <div aria-live="polite">
      {offline && (
        <div className="flex items-center justify-center gap-2 bg-slate-800 px-4 py-1.5 text-center text-xs font-medium text-white">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />{t('offline.banner')}
        </div>
      )}
      {waking && !offline && (
        <div className="flex items-center justify-center gap-2 bg-blue-50 px-4 py-1.5 text-center text-xs font-medium text-blue-800">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{t('waking')}
        </div>
      )}
      {updateReady && (
        <div className="flex items-center justify-center gap-2 bg-teal-700 px-4 py-1.5 text-center text-xs font-medium text-white">
          <RefreshCw className={`h-3.5 w-3.5${updating ? ' animate-spin' : ''}`} aria-hidden="true" />{t('updateAvailable')}
          <button
            type="button"
            disabled={updating}
            onClick={handleRefresh}
            className="rounded bg-white/20 px-2 py-0.5 font-semibold underline disabled:opacity-60"
          >
            {t('refresh')}
          </button>
        </div>
      )}
    </div>
  );
}

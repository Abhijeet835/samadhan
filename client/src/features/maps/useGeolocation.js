import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

/** Shared "Use my location" logic (geolocation only; reverse-geocode elsewhere). */
export function useGeolocation() {
  const { t } = useTranslation();
  const [locating, setLocating] = useState(false);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(t('report.locationUnsupported'));
      return Promise.resolve(null);
    }
    setLocating(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        },
        () => {
          setLocating(false);
          toast.error(t('report.locationFailed'));
          resolve(null);
        },
        { timeout: 10_000, enableHighAccuracy: true },
      );
    });
  }, [t]);

  return { locate, locating };
}

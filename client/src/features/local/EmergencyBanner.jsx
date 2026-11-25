import { useTranslation } from 'react-i18next';
import { PhoneCall } from 'lucide-react';

/** Persistent 112 emergency banner — mounted ONCE in LocalLayout. */
export default function EmergencyBanner() {
  const { t } = useTranslation();
  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-2" role="alert">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center text-xs font-semibold text-red-700 sm:text-sm">
        <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('local.emergency')}
        <a href="tel:112" className="rounded-full bg-red-600 px-2.5 py-0.5 text-white">
          112
        </a>
      </p>
    </div>
  );
}

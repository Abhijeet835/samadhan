import { useTranslation } from 'react-i18next';
import { BadgeIndianRupee, ShieldCheck, Radio } from 'lucide-react';

/**
 * "Why ₹?" — fees are simulated; the commitment prevents spam and is
 * refunded on rejection; pooled support unlocks OFFICIAL amplification.
 * No claims of government authority.
 */
export default function WhyRupee({ compact = false }) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <details className="group rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-blue-800">
          <BadgeIndianRupee className="h-4 w-4" aria-hidden="true" />
          {t('why.title')}
          <span className="ml-auto text-blue-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <p className="mt-2 leading-relaxed text-blue-900/80">{t('why.body')}</p>
        <p className="mt-1.5 text-xs text-blue-700/70">{t('why.note')}</p>
      </details>
    );
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-teal-50 p-6">
      <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <BadgeIndianRupee className="h-5 w-5 text-blue-600" aria-hidden="true" />
        {t('why.title')}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-slate-600">{t('why.body')}</p>
        </div>
        <div className="flex gap-3">
          <Radio className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-slate-600">{t('why.official')}</p>
        </div>
      </div>
      <p className="mt-4 border-t border-blue-100 pt-3 text-xs text-slate-400">{t('why.note')}</p>
    </section>
  );
}

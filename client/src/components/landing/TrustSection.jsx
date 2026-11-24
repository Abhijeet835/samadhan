import { AlertTriangle, IndianRupee, Megaphone, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TRUST_STYLES = [
  {
    Icon: IndianRupee,
    accent: 'bg-emerald-400/10 text-emerald-300',
  },
  {
    Icon: Phone,
    accent: 'bg-amber-300/10 text-amber-300',
  },
  {
    Icon: Megaphone,
    accent: 'bg-cyan-300/10 text-cyan-300',
  },
];

export default function TrustSection() {
  const { t } = useTranslation();

  const items = TRUST_STYLES.map((item, index) => ({
    ...item,
    title: t(`trust.item${index + 1}Title`),
    text: t(`trust.item${index + 1}Text`),
  }));

  return (
    <section id="trust" className="scroll-mt-24 bg-slate-950 py-16 text-slate-100 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            {t('trust.eyebrow')}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {t('trust.title')}
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-300 sm:text-base">
            {t('trust.subtitle')}
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {items.map(({ Icon, accent, title, text }) => (
            <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 sm:flex-row sm:items-start">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-amber-100">{t('trust.disclaimerTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/75">{t('trust.disclaimerText')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

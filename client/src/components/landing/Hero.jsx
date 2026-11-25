import { Link } from 'react-router-dom';
import { ArrowRight, Globe, MapPin, Megaphone, ShieldCheck, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MODE_KEY } from '@/features/local/constants';

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-slate-50 via-white to-background py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            {t('hero.eyebrow')}
          </Badge>

          <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            {t('hero.title')}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Two prominent entry points: Global Mode & Local Mode */}
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
          <article className="surface-card-hover flex flex-col justify-between border-blue-100 bg-gradient-to-br from-blue-50/60 via-white to-white p-6 sm:p-8">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm">
                  <Globe className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                  {t('landing.globalEntry.badge')}
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                {t('landing.globalEntry.title')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t('landing.globalEntry.description')}
              </p>

              <ul className="mt-5 space-y-2 text-xs font-medium text-slate-600 sm:text-sm">
                <li className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  {t('landing.globalEntry.point1')}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  {t('landing.globalEntry.point2')}
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  {t('landing.globalEntry.point3')}
                </li>
              </ul>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => localStorage.setItem(MODE_KEY, 'GLOBAL')}
              >
                <Link to="/issues">
                  {t('landing.globalEntry.primaryCta')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Link to="/report">{t('landing.globalEntry.secondaryCta')}</Link>
              </Button>
            </div>
          </article>

          <article className="surface-card-hover flex flex-col justify-between border-teal-100 bg-gradient-to-br from-teal-50/60 via-white to-white p-6 sm:p-8">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-700 text-white shadow-sm">
                  <Store className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
                  {t('landing.localEntry.badge')}
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                {t('landing.localEntry.title')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t('landing.localEntry.description')}
              </p>

              <ul className="mt-5 space-y-2 text-xs font-medium text-slate-600 sm:text-sm">
                <li className="flex items-center gap-2">
                  <Store className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                  {t('landing.localEntry.point1')}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                  {t('landing.localEntry.point2')}
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                  {t('landing.localEntry.point3')}
                </li>
              </ul>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="flex-1 bg-teal-700 text-white hover:bg-teal-800"
                onClick={() => localStorage.setItem(MODE_KEY, 'LOCAL')}
              >
                <Link to="/local">
                  {t('landing.localEntry.primaryCta')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-teal-200 text-teal-800 hover:bg-teal-50">
                <Link to="/local/register">{t('landing.localEntry.secondaryCta')}</Link>
              </Button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

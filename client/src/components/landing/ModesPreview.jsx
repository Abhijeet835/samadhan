import { Check, Globe, MapPin, Phone, ShieldCheck, Star, User, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function PointList({ points, accent }) {
  return (
    <ul className="mt-5 space-y-2.5">
      {points.map((point) => (
        <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full', accent)}>
            <Check className="h-3 w-3" aria-hidden="true" />
          </span>
          {point}
        </li>
      ))}
    </ul>
  );
}

export default function ModesPreview() {
  const { t } = useTranslation();

  const globalPoints = [t('modes.global.point1'), t('modes.global.point2'), t('modes.global.point3')];
  const localPoints = [t('modes.local.point1'), t('modes.local.point2'), t('modes.local.point3')];

  return (
    <section id="modes" className="scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-helper/20 bg-helper-soft text-helper">
            {t('modes.eyebrow')}
          </Badge>
          <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('modes.title')}
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('modes.subtitle')}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <article className="group relative overflow-hidden rounded-3xl border bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-civic-indigo via-civic-indigo to-civic-amber" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl transition-colors group-hover:bg-primary/15" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Globe className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    {t('modes.global.label')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('modes.global.tagline')}</p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 border-primary/15 bg-primary/5 text-primary">
                {t('common.preview')}
              </Badge>
            </div>

            <h3 className="mt-6 text-2xl font-extrabold tracking-tight">{t('modes.global.title')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('modes.global.description')}</p>

            <PointList points={globalPoints} accent="bg-primary/10 text-primary" />

            <div className="mt-6 rounded-2xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-muted-foreground">{t('modes.global.previewLabel')}</span>
                <span className="font-bold text-foreground">{t('modes.global.previewAmount')}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-primary to-civic-amber" />
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {t('modes.global.previewSupporters')}
              </div>
            </div>

            <p className="mt-4 text-xs font-medium text-muted-foreground">{t('modes.global.note')}</p>
          </article>

          <article className="group relative overflow-hidden rounded-3xl border bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-helper via-helper to-emerald-400" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-helper/10 blur-2xl transition-colors group-hover:bg-helper/15" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-helper/10 text-helper">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-helper">
                    {t('modes.local.label')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('modes.local.tagline')}</p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 border-helper/20 bg-helper-soft text-helper">
                {t('common.preview')}
              </Badge>
            </div>

            <h3 className="mt-6 text-2xl font-extrabold tracking-tight">{t('modes.local.title')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('modes.local.description')}</p>

            <PointList points={localPoints} accent="bg-helper/10 text-helper" />

            <div className="mt-6 rounded-2xl border border-helper/15 bg-helper-soft/70 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-helper shadow-sm">
                  <User className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold">{t('modes.local.previewHelperName')}</p>
                    <ShieldCheck className="h-4 w-4 shrink-0 text-helper" aria-hidden="true" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{t('modes.local.previewHelperRole')}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-civic-amber">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  {t('modes.local.previewRating')}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-helper" aria-hidden="true" />
                  {t('modes.local.point2')}
                </span>
                <span
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-helper px-3 text-xs font-semibold text-white shadow-sm"
                  title={t('common.comingSoon')}
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('modes.local.previewConnect')}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs font-medium text-muted-foreground">{t('modes.local.note')}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

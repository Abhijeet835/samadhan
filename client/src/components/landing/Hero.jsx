import {
  ArrowRight,
  IndianRupee,
  Languages,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import HealthBadge from '@/components/HealthBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function HeroPreview() {
  const { t } = useTranslation();

  return (
    <div className="relative mx-auto w-full max-w-md animate-fade-up lg:max-w-none" style={{ animationDelay: '120ms' }}>
      <div className="pointer-events-none absolute inset-x-8 top-12 h-64 rounded-full bg-gradient-to-r from-primary/20 via-primary/10 to-helper/20 blur-3xl" />

      <div className="relative">
        <div className="relative z-10 rounded-3xl border bg-card p-5 shadow-lift sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="spotlight">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              {t('hero.preview.issueLabel')}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-500" aria-hidden="true" />
              {t('hero.preview.live')}
            </span>
          </div>

          <h2 className="mt-4 text-lg font-bold leading-snug tracking-tight sm:text-xl">
            {t('hero.preview.issueTitle')}
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {t('hero.preview.issueMeta', { count: 24 })}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border bg-muted/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t('hero.preview.fundLabel')}
                </p>
                <p className="mt-1 text-xl font-extrabold tracking-tight">{t('hero.preview.fundRaised')}</p>
              </div>
              <span className="text-right text-[11px] font-semibold text-civic-amber">
                {t('hero.preview.fundRemaining')}
              </span>
            </div>

            <div className="relative mt-4 h-2 rounded-full bg-slate-200">
              <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-civic-indigo via-civic-indigo to-civic-amber" />
              <span
                className="absolute left-[40%] top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-white shadow-sm"
                aria-hidden="true"
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground">
              <span>{t('hero.preview.spotlightLabel')}</span>
              <span>{t('hero.preview.escalateLabel')}</span>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t('hero.preview.issueFooter')}</p>
        </div>

        <div className="relative z-20 mx-4 -mt-4 rounded-2xl border bg-card p-4 shadow-soft sm:mx-8">
          <Badge variant="helper" className="mb-3">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t('hero.preview.helperLabel')}
          </Badge>

          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-helper-soft text-helper">
              <User className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold">{t('hero.preview.helperName')}</p>
                <ShieldCheck className="h-4 w-4 shrink-0 text-helper" aria-hidden="true" />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {t('hero.preview.helperRole')} · {t('hero.preview.helperMeta')}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] leading-snug text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-helper" aria-hidden="true" />
              {t('hero.preview.helperNote')}
            </span>
            <span
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-helper px-3 text-xs font-semibold text-white shadow-sm"
              title={t('common.comingSoon')}
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {t('hero.preview.connect')}
            </span>
          </div>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {t('hero.preview.status')}
        </p>
      </div>
    </div>
  );
}

export default function Hero() {
  const { t } = useTranslation();

  const trustItems = [
    { Icon: IndianRupee, label: t('hero.trustMoney') },
    { Icon: Languages, label: t('hero.trustBilingual') },
    { Icon: Smartphone, label: t('hero.trustMobile') },
  ];

  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-grid-slate opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-helper/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="animate-fade-up">
          <Badge
            variant="outline"
            className="max-w-full whitespace-normal border-primary/15 bg-card/80 px-3 py-1 text-left text-[11px] font-semibold uppercase leading-snug tracking-[0.12em] text-primary shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('hero.eyebrow')}
          </Badge>

          <h1 className="mt-5 max-w-2xl text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('hero.titleLead')}{' '}
            <span className="bg-gradient-to-r from-civic-indigo to-helper bg-clip-text text-transparent">
              {t('hero.titleHighlight')}
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('hero.subtitle')}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <a href="#how-it-works">
                {t('hero.primaryCta')}
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#modes">{t('hero.secondaryCta')}</a>
            </Button>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
            {trustItems.map(({ Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-helper" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <HealthBadge />
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

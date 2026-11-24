import { Camera, Megaphone, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STEP_STYLES = [
  {
    Icon: Camera,
    accent: 'bg-primary/10 text-primary',
    number: '01',
  },
  {
    Icon: Users,
    accent: 'bg-civic-amber/10 text-civic-amber',
    number: '02',
  },
  {
    Icon: Megaphone,
    accent: 'bg-helper/10 text-helper',
    number: '03',
  },
];

export default function HowItWorks() {
  const { t } = useTranslation();

  const steps = STEP_STYLES.map((step, index) => ({
    ...step,
    title: t(`how.step${index + 1}Title`),
    text: t(`how.step${index + 1}Text`),
  }));

  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-border/60 bg-card/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="border-primary/15 bg-primary/5 text-primary">
            {t('how.eyebrow')}
          </Badge>
          <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('how.title')}
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('how.subtitle')}
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map(({ Icon, accent, number, title, text }) => (
            <article
              key={number}
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-soft"
            >
              <span
                className="pointer-events-none absolute right-5 top-4 text-5xl font-extrabold tracking-tighter text-slate-100 transition-colors group-hover:text-primary/10"
                aria-hidden="true"
              >
                {number}
              </span>

              <div className={cn('grid h-11 w-11 place-items-center rounded-xl', accent)}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t('how.stepLabel', { number })}
              </p>
              <h3 className="mt-2 text-lg font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

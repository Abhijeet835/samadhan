import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, CheckCircle2, Flame, Globe, HandCoins, Megaphone, Search, Store } from 'lucide-react';

import { cn } from '@/lib/utils';

export default function HowItWorks() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('global');

  const globalSteps = [
    { icon: Megaphone, title: t('landing.walkthrough.global.step1Title'), text: t('landing.walkthrough.global.step1Text') },
    { icon: HandCoins, title: t('landing.walkthrough.global.step2Title'), text: t('landing.walkthrough.global.step2Text') },
    { icon: Flame, title: t('landing.walkthrough.global.step3Title'), text: t('landing.walkthrough.global.step3Text') },
  ];

  const localSteps = [
    { icon: Search, title: t('landing.walkthrough.local.step1Title'), text: t('landing.walkthrough.local.step1Text') },
    { icon: CalendarCheck, title: t('landing.walkthrough.local.step2Title'), text: t('landing.walkthrough.local.step2Text') },
    { icon: CheckCircle2, title: t('landing.walkthrough.local.step3Title'), text: t('landing.walkthrough.local.step3Text') },
  ];

  const steps = activeTab === 'global' ? globalSteps : localSteps;

  return (
    <section id="how-it-works" className="py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {t('landing.walkthrough.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            {t('landing.walkthrough.subtitle')}
          </p>

          <div className="mx-auto mt-7 max-w-sm">
            <div className="tab-bar" role="tablist" aria-label={t('landing.walkthrough.title')}>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'global'}
                onClick={() => setActiveTab('global')}
                className={cn('tab-pill', activeTab === 'global' ? 'bg-blue-600 text-white shadow-sm' : 'tab-pill-idle')}
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                {t('nav.global')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'local'}
                onClick={() => setActiveTab('local')}
                className={cn('tab-pill', activeTab === 'local' ? 'bg-teal-700 text-white shadow-sm' : 'tab-pill-idle')}
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                {t('nav.local')}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="surface-card p-6">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'grid h-11 w-11 place-items-center rounded-xl',
                      activeTab === 'global' ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-700',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

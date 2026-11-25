import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, CheckCircle2, Globe, MapPin, ShieldCheck, Sparkles } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function TrustSection() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    api.get('/issues/stats/locations').then((r) => setOverview(r.data.overview)).catch(() => {});
    api.get('/issues/stats/partners').then((r) => setPartners(r.data.partners?.slice(0, 3) ?? [])).catch(() => {});
  }, []);

  return (
    <section className="border-t border-border/60 bg-slate-50/70 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {overview && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: t('landing.stats.totalIssues'), value: overview.totalIssues ?? 0, icon: Globe },
              { label: t('landing.stats.resolvedIssues'), value: overview.resolvedCount ?? 0, icon: CheckCircle2 },
              { label: t('landing.stats.thresholdsReached'), value: overview.thresholdReachedCount ?? 0, icon: Sparkles },
              { label: t('landing.stats.statesCovered'), value: `${overview.statesWithIssues ?? 0} / ${overview.totalStatesAndUts ?? 36}`, icon: MapPin },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="surface-card p-4 text-center">
                <Icon className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
                <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        )}

        {partners.length > 0 && (
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <Award className="h-5 w-5 text-amber-500" aria-hidden="true" />
                  {t('landing.partners.title')}
                </h2>
                <p className="mt-1 text-sm text-slate-600">{t('landing.partners.subtitle')}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/states">{t('landing.partners.viewAll')}</Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {partners.map((p) => (
                <div key={`${p.solverType}-${p.organizationName}`} className="surface-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                      {t(`resolution.solverTypes.${p.solverType}`)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {t('landing.partners.solvedCount', { count: p.solvedCount })}
                    </span>
                  </div>
                  <h3 className="mt-3 font-bold text-slate-900">{p.organizationName}</h3>
                  {p.promotion?.tagline && (
                    <p className="mt-1 text-xs text-slate-600">{p.promotion.tagline}</p>
                  )}
                  {p.promotion?.badgeText && (
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {p.promotion.badgeText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500 sm:text-sm">
          {t('trust.disclaimer')}
        </div>
      </div>
    </section>
  );
}

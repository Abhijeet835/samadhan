import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, CheckCircle2, Flame, Globe, MapPin } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPaise } from '@/features/wallet/money';
import { INDIA_STATES_AND_UTS, getStateLabel } from '@/lib/indiaLocations';
import { currentLang } from '@/features/global/localizeIssue';

const FALLBACK_STATES = INDIA_STATES_AND_UTS.map((st) => ({
  code: st.code,
  type: st.type,
  state: st.nameEn,
  stateHi: st.nameHi,
  total: 0,
  active: 0,
  resolved: 0,
}));

export default function StateExplorerPage() {
  const { t, i18n } = useTranslation();
  const lang = currentLang(i18n.language);
  const [data, setData] = useState(null);
  const [partners, setPartners] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    Promise.allSettled([
      api.get('/issues/stats/locations', { params: { lang, ...(selectedState ? { state: selectedState } : {}) } }),
      api.get('/issues/stats/partners', { params: { lang } }),
    ]).then(([locRes, partnerRes]) => {
      if (!active) return;
      if (locRes.status === 'fulfilled') {
        setData(locRes.value.data);
      } else {
        setError(true);
      }
      if (partnerRes.status === 'fulfilled') {
        setPartners(partnerRes.value.data.partners ?? []);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [selectedState, reloadTick, lang]);

  const overview = data?.overview;
  const states = data?.states?.length ? data.states : FALLBACK_STATES;
  const areas = data?.areas ?? [];

  return (
    <div className="min-h-screen bg-slate-50/70 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('states.eyebrow')}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{t('states.title')}</h1>
            <p className="mt-1.5 text-sm text-slate-600">{t('states.subtitle')}</p>
          </div>
          <Link to="/issues">
            <Button variant="outline">{t('states.browseAllIssues')}</Button>
          </Link>
        </div>

        {overview && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: t('states.kpiTotal'), value: overview.totalIssues, icon: Globe },
              { label: t('states.kpiExplosions'), value: overview.thresholdReachedCount, icon: Flame },
              { label: t('states.kpiResolved'), value: overview.resolvedCount, icon: CheckCircle2 },
              { label: t('states.kpiPoolTotal'), value: formatPaise(overview.totalFundPaise, i18n.language), icon: Award },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="surface-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">{label}</span>
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <p className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            <span>{t('issues.errors.loadFailed')}</span>
            <Button variant="outline" size="sm" onClick={() => setReloadTick((n) => n + 1)}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">{t('states.directoryTitle')}</h2>
              {selectedState && (
                <Button size="sm" variant="ghost" onClick={() => setSelectedState('')}>
                  {t('states.clearFilter')}
                </Button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {states.map((st) => {
                  const active = selectedState === st.state;
                  return (
                    <div
                      key={st.code}
                      className={cn(
                        'surface-card flex flex-col justify-between p-4 transition',
                        active && 'border-primary ring-2 ring-primary/20',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {st.type === 'UT' ? t('states.utLabel') : t('states.stateLabel')} · {st.code}
                          </span>
                          <h3 className="text-base font-bold text-slate-900">
                            {lang === 'hi' ? st.stateHi : st.state}
                          </h3>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-blue-700">
                          {t('states.issueCount', { count: st.total })}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>{t('states.resolvedMini', { count: st.resolved })}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedState(active ? '' : st.state)}
                            className="font-semibold text-primary hover:underline"
                          >
                            {active ? t('states.selected') : t('states.viewAreas')}
                          </button>
                          {st.total > 0 && (
                            <Link to={`/issues?state=${encodeURIComponent(st.state)}`} className="font-semibold text-slate-700 hover:underline">
                              {t('states.openFeed')}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="surface-card p-5">
              <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                {selectedState ? t('states.areasIn', { state: getStateLabel(selectedState, i18n.language) }) : t('states.topAreas')}
              </h2>
              {areas.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">{t('states.noAreas')}</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {areas.map((a) => (
                    <li key={`${a.state}-${a.city}`} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-semibold text-slate-800">{a.city}</p>
                        <p className="text-xs text-slate-400">{getStateLabel(a.state, i18n.language)}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-bold text-slate-700">{t('states.issueCount', { count: a.total })}</p>
                        <p className="text-emerald-700">{t('states.resolvedMini', { count: a.resolved })}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {partners.length > 0 && (
              <div className="surface-card p-5">
                <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                  <Award className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  {t('landing.partners.title')}
                </h2>
                <ul className="mt-3 space-y-3">
                  {partners.map((p) => (
                    <li key={`${p.solverType}-${p.organizationName}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className="text-[10px] font-bold uppercase text-emerald-700">
                        {t(`resolution.solverTypes.${p.solverType}`)}
                      </span>
                      <p className="font-bold text-slate-900">{p.organizationName}</p>
                      {p.promotion?.tagline && <p className="mt-0.5 text-xs text-slate-600">{p.promotion.tagline}</p>}
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        {t('landing.partners.solvedCount', { count: p.solvedCount })}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Crosshair,
  Inbox,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Store,
  UserPlus,
  X,
} from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { forwardGeocode, parseAddressParts, reverseGeocode } from '@/features/global/geocode';
import HelperCard from '@/features/local/HelperCard';
import {
  CATEGORY_ICONS,
  LOCAL_CATEGORIES,
  SEARCH_RADII,
  clearLocalLocation,
  loadLocalLocation,
  saveLocalLocation,
} from '@/features/local/constants';
import { INDIA_STATES_AND_UTS } from '@/lib/indiaLocations';

const HelperMap = lazy(() => import('@/features/maps/HelperMap'));

export default function LocalHomePage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();

  const [location, setLocation] = useState(() => loadLocalLocation());
  const [geoInput, setGeoInput] = useState('');
  const [locating, setLocating] = useState(false);

  const view = params.get('view') === 'map' ? 'map' : 'list';
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [stateFilter, setStateFilter] = useState(params.get('state') ?? '');
  const [searchText, setSearchText] = useState(params.get('q') ?? '');
  const [radiusKm, setRadiusKm] = useState(10);
  const [sort, setSort] = useState(() => (loadLocalLocation() ? 'nearest' : 'rating'));

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(LOCAL_CATEGORIES);
  const [pagination, setPagination] = useState(null);
  const [fallbackActive, setFallbackActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/helpers/meta')
      .then((res) => {
        if (Array.isArray(res.data?.categories) && res.data.categories.length > 0) {
          setCategories(res.data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const hasGeo = Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lng));

  // Keep local state synced when navigating via URL query params (e.g., ?category=CAB_AUTO)
  useEffect(() => {
    const pCat = params.get('category') ?? '';
    const pState = params.get('state') ?? '';
    const pQ = params.get('q') ?? '';
    setCategory(pCat);
    setStateFilter(pState);
    if (pQ) setSearchText(pQ);
  }, [params]);

  const updateUrlParam = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const load = useCallback(
    async (page = 1, append = false) => {
      if (!append) setLoading(true);
      setError(false);
      setFallbackActive(false);
      try {
        const baseParams = {
          page,
          limit: 12,
          sort: hasGeo ? sort : sort === 'nearest' ? 'rating' : sort,
          ...(category ? { category } : {}),
          ...(stateFilter ? { state: stateFilter } : {}),
          ...(searchText.trim() ? { q: searchText.trim() } : {}),
        };

        const res = await api.get('/helpers/search', {
          params: hasGeo ? { ...baseParams, lat: location.lat, lng: location.lng, radiusKm } : baseParams,
        });

        let nextItems = res.data.items ?? [];
        let nextPagination = res.data.pagination;

        // If saved GPS location yields 0 nearby providers on page 1, fall back smoothly to nationwide directory
        if (!append && hasGeo && nextItems.length === 0) {
          const fallbackRes = await api.get('/helpers/search', {
            params: {
              ...baseParams,
              sort: sort === 'nearest' ? 'rating' : sort,
            },
          });
          if ((fallbackRes.data.items ?? []).length > 0) {
            nextItems = fallbackRes.data.items;
            nextPagination = fallbackRes.data.pagination;
            setFallbackActive(true);
          }
        }

        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setPagination(nextPagination);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [hasGeo, location?.lat, location?.lng, category, stateFilter, searchText, radiusKm, sort],
  );

  useEffect(() => {
    const id = setTimeout(() => load(1), searchText ? 280 : 0);
    return () => clearTimeout(id);
  }, [load, searchText]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error(t('report.locationUnsupported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let label = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
        try {
          const parts = parseAddressParts(await reverseGeocode(latitude, longitude));
          label = [parts.address, parts.city].filter(Boolean).join(', ') || label;
        } catch {
          /* coordinates suffice */
        }
        const next = { lat: latitude, lng: longitude, label };
        saveLocalLocation(next);
        setLocation(next);
        setSort('nearest');
        setLocating(false);
        toast.success(t('report.locationSet'));
      },
      () => {
        setLocating(false);
        toast.error(t('report.locationFailed'));
      },
      { timeout: 10_000 },
    );
  }

  async function locateByAddress(e) {
    e.preventDefault();
    const q = geoInput.trim();
    if (!q) {
      handleClearLocation();
      return;
    }
    setLocating(true);
    try {
      const result = await forwardGeocode(`${q}, India`);
      if (result) {
        const next = { lat: Number(result.lat), lng: Number(result.lon), label: q };
        saveLocalLocation(next);
        setLocation(next);
        setSort('nearest');
      } else {
        setSearchText(q);
      }
    } catch {
      setSearchText(q);
    } finally {
      setLocating(false);
    }
  }

  function handleClearLocation() {
    clearLocalLocation();
    setLocation(null);
    setGeoInput('');
    setFallbackActive(false);
    setSort('rating');
  }

  // One-click demo pin: the seed contains verified providers inside/around
  // BIT Mesra and PMC, Ranchi, so testers can see nearby results instantly.
  function useDemoCampus() {
    const next = {
      lat: 23.4175,
      lng: 85.4394,
      label: t('local.demoBitMesraLabel'),
    };
    saveLocalLocation(next);
    setLocation(next);
    setGeoInput('');
    setRadiusKm(10);
    setSort('nearest');
    toast.success(t('report.locationSet'));
  }

  function selectCategory(nextCat) {
    const chosen = category === nextCat ? '' : nextCat;
    setCategory(chosen);
    updateUrlParam({ category: chosen });
  }

  function resetAllFilters() {
    setCategory('');
    setStateFilter('');
    setSearchText('');
    handleClearLocation();
    updateUrlParam({ category: '', state: '', q: '', view: '' });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Unified Local Marketplace Header */}
      <div className="rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 p-6 text-white shadow-lift sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">{t('local.eyebrow')}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('local.title')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-teal-100/90">{t('local.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(user?.role === 'PROVIDER' || user?.hasHelperProfile) ? (
              <Link
                to="/local/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-teal-900 shadow-sm transition hover:bg-teal-50"
              >
                {t('nav.providerHub')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/local/register"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {t('local.registerCta')}
              </Link>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t('local.marketplaceBadge')}
          </span>
        </div>
      </div>

      {/* Interactive 7-Category Cards */}
      <h2 className="mt-7 text-sm font-bold uppercase tracking-wider text-slate-500">{t('local.categoriesTitle')}</h2>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
        <button
          type="button"
          onClick={() => {
            setCategory('');
            updateUrlParam({ category: '' });
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition',
            !category
              ? 'border-teal-700 bg-teal-700 text-white shadow-sm'
              : 'border-teal-100 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/60',
          )}
        >
          <span
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              !category ? 'bg-white/15 text-white' : 'bg-teal-50 text-teal-700',
            )}
          >
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold leading-tight">{t('local.allCategories')}</span>
        </button>

        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] ?? Store;
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => selectCategory(cat)}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition',
                active
                  ? 'border-teal-700 bg-teal-700 text-white shadow-sm'
                  : 'border-teal-100 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/60',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  active ? 'bg-white/15 text-white' : 'bg-teal-50 text-teal-700',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold leading-tight">{t(`local.categories.${cat}`)}</span>
            </button>
          );
        })}
      </div>

      {/* Location + Search + State + Sort Bar */}
      <div className="surface-card mt-5 space-y-3 border-teal-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700 sm:text-sm">
            <MapPin className="mr-1 inline h-4 w-4 text-teal-700" aria-hidden="true" />
            {hasGeo ? t('local.locationSet', { label: location.label }) : t('local.searchAllIndia')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {user?.homeLocation?.coordinates && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-teal-200 text-xs text-teal-800"
                onClick={() => {
                  const [lng, lat] = user.homeLocation.coordinates;
                  const next = {
                    lat,
                    lng,
                    label: user.homeLocation.city || user.homeLocation.address || t('maps.homeLocation'),
                  };
                  saveLocalLocation(next);
                  setLocation(next);
                  setSort('nearest');
                }}
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {t('maps.useSavedHome')}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={useDemoCampus}
              className="h-8 gap-1.5 border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {t('local.demoBitMesra')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={useMyLocation}
              disabled={locating}
              className="h-8 gap-1.5 border-teal-200 text-xs text-teal-800"
            >
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
              {t('report.useMyLocation')}
            </Button>
            {hasGeo && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClearLocation}
                className="h-8 gap-1 text-xs text-slate-600"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {t('local.browseNationwide')}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-2.5 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t('local.searchPlaceholder')}
              aria-label={t('local.searchPlaceholder')}
              className="field-input pl-10"
            />
          </div>

          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              updateUrlParam({ state: e.target.value });
            }}
            aria-label={t('issues.feed.stateAll')}
            className="field-input md:col-span-3"
          >
            <option value="">{t('issues.feed.stateAll')}</option>
            {INDIA_STATES_AND_UTS.map((s) => (
              <option key={s.code} value={s.nameEn}>
                {i18n.language === 'hi' ? s.nameHi : s.nameEn}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label={t('issues.feed.sortLabel')}
            className="field-input md:col-span-3"
          >
            {hasGeo && <option value="nearest">{t('local.sort.nearest')}</option>}
            <option value="rating">{t('local.sort.rating')}</option>
            <option value="price_asc">{t('local.sort.priceAsc')}</option>
            <option value="bookings">{t('local.sort.bookings')}</option>
          </select>
        </div>

        <form onSubmit={locateByAddress} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={geoInput}
            onChange={(e) => setGeoInput(e.target.value)}
            placeholder={t('local.addressPlaceholder')}
            aria-label={t('local.addressPlaceholder')}
            className="field-input flex-1"
          />
          <Button type="submit" disabled={locating} className="shrink-0 bg-teal-700 hover:bg-teal-800">
            {t('local.searchCta')}
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {hasGeo && (
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                {SEARCH_RADII.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadiusKm(r)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                      radiusKm === r ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    {t('local.radiusKm', { km: r })}
                  </button>
                ))}
              </div>
            )}
            {pagination && (
              <p className="text-xs font-medium text-slate-500">
                {t('local.providersCount', { count: pagination.total })}
              </p>
            )}
          </div>

          <div className="tab-bar max-w-[200px]" role="tablist">
            {['list', 'map'].map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => updateUrlParam({ view: v === 'map' ? 'map' : '' })}
                className={cn('tab-pill text-xs py-1.5', view === v ? 'tab-pill-active' : 'tab-pill-idle')}
              >
                {t(`maps.${v}View`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {fallbackActive && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900">
          <span>{t('local.noNearbyFallback', { km: radiusKm, label: location?.label })}</span>
          <button type="button" onClick={handleClearLocation} className="font-bold underline">
            {t('local.browseNationwide')}
          </button>
        </div>
      )}

      {/* Results List or Map */}
      <div className="mt-5">
        {view === 'map' ? (
          <Suspense fallback={<div className="h-[480px] animate-pulse rounded-2xl bg-teal-100/50" />}>
            <HelperMap
              location={hasGeo && !fallbackActive ? location : null}
              category={category}
              stateFilter={stateFilter}
              q={searchText.trim()}
              radiusKm={radiusKm}
              sort={sort}
            />
          </Suspense>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('common.loading')}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-teal-100/50" />
            ))}
          </div>
        ) : error ? (
          <div className="surface-card border-dashed py-12 text-center">
            <p className="text-slate-600">{t('local.loadFailed')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>
              {t('common.retry')}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-2 border-dashed py-16 text-center">
            <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="font-semibold text-slate-700">{t('local.emptySearch')}</p>
            <Button variant="outline" size="sm" onClick={resetAllFilters}>
              {t('local.browseNationwide')}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((h) => (
                <HelperCard key={h._id} helper={h} />
              ))}
            </div>
            {pagination && pagination.page < pagination.totalPages && (
              <Button variant="outline" className="mt-6 w-full" onClick={() => load(pagination.page + 1, true)}>
                {t('common.loadMore')}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Bottom Provider Onboarding CTAs */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <Link
          to="/local/register"
          className="surface-card-hover group border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5"
        >
          <UserPlus className="h-6 w-6 text-teal-700" aria-hidden="true" />
          <p className="mt-2 font-bold text-slate-900">{t('local.registerCta')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('local.registerHint')}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
            {t('local.getStarted')}{' '}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
        <Link to="/local/dashboard" className="surface-card-hover group p-5">
          <ShieldCheck className="h-6 w-6 text-slate-700" aria-hidden="true" />
          <p className="mt-2 font-bold text-slate-900">{t('local.dashboardCta')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('local.dashboardHint')}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
            {t('nav.providerHub')}{' '}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowRight, Crosshair, Loader2, MapPin, Search, ShieldCheck, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { forwardGeocode, parseAddressParts, reverseGeocode } from '@/features/global/geocode';
import { CATEGORY_ICONS, LOCAL_CATEGORIES, loadLocalLocation, saveLocalLocation } from '@/features/local/constants';

export default function LocalHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [location, setLocation] = useState(loadLocalLocation());
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);

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
        } catch { /* coordinates are enough */ }
        const next = { lat: latitude, lng: longitude, label };
        saveLocalLocation(next);
        setLocation(next);
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

  async function searchByAddress(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLocating(true);
    try {
      const result = await forwardGeocode(query.trim());
      if (!result) {
        toast.error(t('report.geocodeFailed'));
        return;
      }
      const next = { lat: Number(result.lat), lng: Number(result.lon), label: query.trim() };
      saveLocalLocation(next);
      setLocation(next);
      navigate('/local/search');
    } catch {
      toast.error(t('report.geocodeFailed'));
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">{t('local.eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{t('local.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-teal-100/90">{t('local.subtitle')}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('local.freeNote')}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">
          <MapPin className="mr-1 inline h-4 w-4 text-teal-700" aria-hidden="true" />
          {location ? t('local.locationSet', { label: location.label }) : t('local.setLocation')}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {user?.homeLocation?.coordinates && (
            <Button type="button" variant="outline" className="gap-2 border-teal-200 text-teal-800" onClick={() => {
              const [lng, lat] = user.homeLocation.coordinates;
              const next = { lat, lng, label: user.homeLocation.city || user.homeLocation.address || t('maps.homeLocation') };
              saveLocalLocation(next);
              setLocation(next);
              navigate('/local/search');
            }}>
              <MapPin className="h-4 w-4" />
              {t('maps.useSavedHome')}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating} className="gap-2 border-teal-200 text-teal-800">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            {t('report.useMyLocation')}
          </Button>
          <form onSubmit={searchByAddress} className="flex flex-1 gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('local.addressPlaceholder')}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-500"
            />
            <Button type="submit" disabled={locating} className="gap-1.5 bg-teal-700 hover:bg-teal-800">
              <Search className="h-4 w-4" aria-hidden="true" />
              {t('local.searchCta')}
            </Button>
          </form>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-bold text-slate-900">{t('local.categoriesTitle')}</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
        {LOCAL_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category];
          return (
            <Link
              key={category}
              to={`/local/search?category=${category}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-teal-100 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700 transition-colors group-hover:bg-teal-700 group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-700">{t(`local.categories.${category}`)}</span>
            </Link>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-400">{t('local.cabNote')}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to="/local/register" className="group rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <UserPlus className="h-6 w-6 text-teal-700" aria-hidden="true" />
          <p className="mt-2 font-bold text-slate-900">{t('local.registerCta')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('local.registerHint')}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
            {t('local.getStarted')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
        <Link to="/local/dashboard" className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <ShieldCheck className="h-6 w-6 text-slate-600" aria-hidden="true" />
          <p className="mt-2 font-bold text-slate-900">{t('local.dashboardCta')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('local.dashboardHint')}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
            {t('local.openDashboard')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      </div>
    </div>
  );
}

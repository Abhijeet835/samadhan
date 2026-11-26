import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Crosshair, Loader2, ShieldAlert, Upload } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { forwardGeocode, parseAddressParts, reverseGeocode } from '@/features/global/geocode';
import { uploadPhoto } from '@/features/global/uploadPhoto';
import { LOCAL_CATEGORIES } from '@/features/local/constants';
import { INDIA_STATES_AND_UTS, getCitiesForState } from '@/lib/indiaLocations';
import { getErrorMessage } from '@/lib/errors';
import { currentLang } from '@/features/global/localizeIssue';

const LocationPicker = lazy(() => import('@/features/maps/LocationPicker'));
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

export default function HelperRegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [categories, setCategories] = useState(LOCAL_CATEGORIES);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    displayName: '',
    phone: user?.phone || '',
    categories: ['PLUMBER_ELECTRICIAN'],
    experienceYears: 2,
    bio: '',
    basePriceRupees: 299,
    priceHint: 'From ₹299',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    radiusKm: 10,
    photoUrl: '',
  });
  const [coords, setCoords] = useState({ lat: 12.9716, lng: 77.5946 });
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    api.get('/helpers/meta')
      .then((res) => {
        const list = res.data?.categories;
        if (Array.isArray(list) && list.length > 0) {
          setCategories(list);
          setForm((prev) => ({
            ...prev,
            categories: prev.categories.filter((c) => list.includes(c)).length
              ? prev.categories.filter((c) => list.includes(c))
              : [list[0]],
          }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      setChecking(false);
      return;
    }
    api.get('/helpers/me/dashboard')
      .then(() => navigate('/local/dashboard', { replace: true }))
      .catch(() => setChecking(false));
  }, [navigate, user?.role]);

  if (user?.role === 'ADMIN') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
        <p className="mt-3 font-semibold text-slate-800">{t('local.adminCannotRegister')}</p>
      </div>
    );
  }

  function toggleCategory(category) {
    setForm((prev) => {
      const has = prev.categories.includes(category);
      if (has) {
        if (prev.categories.length === 1) return prev;
        return { ...prev, categories: prev.categories.filter((c) => c !== category) };
      }
      if (prev.categories.length >= 4) return prev;
      return { ...prev, categories: [...prev.categories, category] };
    });
  }

  function handleStateChange(nextState) {
    const city = getCitiesForState(nextState)[0];
    set({ state: nextState, city: city?.nameEn || '', pincode: city?.pincode || '' });
    if (city) setCoords({ lat: city.lat, lng: city.lng });
  }

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error(t('report.locationUnsupported'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const parts = parseAddressParts(await reverseGeocode(latitude, longitude));
          set({
            ...(parts.address && { address: parts.address }),
            ...(parts.city && { city: parts.city }),
            ...(parts.state && { state: parts.state }),
            ...(parts.pincode && { pincode: parts.pincode }),
          });
        } catch { /* manual still works */ }
        setLocating(false);
        toast.success(t('report.locationSet'));
      },
      () => { setLocating(false); toast.error(t('report.locationFailed')); },
      { timeout: 10_000 },
    );
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadPhoto(file);
      set({ photoUrl: url });
      toast.success(t('report.photos.uploaded'));
    } catch (err) {
      const code = err.response?.data?.error?.code;
      toast.error(code === 'CLOUDINARY_NOT_CONFIGURED' ? t('report.photos.unavailable') : t('report.photos.failed'));
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    if (form.categories.length === 0) {
      toast.error(t('local.selectOneCategory'));
      return;
    }
    setSubmitting(true);
    try {
      let position = coords;
      if (!position) {
        const query = [form.address, form.city, form.state, 'India', form.pincode].filter(Boolean).join(', ');
        const result = await forwardGeocode(query);
        if (!result) {
          toast.error(t('report.geocodeFailed'));
          return;
        }
        position = { lat: Number(result.lat), lng: Number(result.lon) };
      }
      const basePricePaise = Math.max(100, Math.round((Number(form.basePriceRupees) || 299) * 100));
      await api.post('/helpers', {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        categories: form.categories,
        experienceYears: Number(form.experienceYears),
        bio: form.bio.trim(),
        basePricePaise,
        priceHint: form.priceHint.trim() || `From ₹${Math.round(basePricePaise / 100)}`,
        photoUrl: form.photoUrl,
        radiusKm: Number(form.radiusKm),
        serviceLocation: {
          coordinates: [position.lng, position.lat],
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        },
      });
      toast.success(t('local.registered'));
      await refreshUser?.();
      navigate('/local/dashboard');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'HELPER_PROFILE_EXISTS') navigate('/local/dashboard');
      else toast.error(getErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <div className="mx-auto max-w-2xl px-4 py-8"><div className="h-96 animate-pulse rounded-2xl bg-teal-100/50" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('local.registerTitle')}</h1>
      <p className="mt-2 text-slate-600">{t('local.registerSubtitle')}</p>

      <Card className="mt-6 border-teal-100">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className={labelClass}>{t('local.displayName')}</label>
              <input className="field-input" value={form.displayName} onChange={(e) => set({ displayName: e.target.value })} required minLength={2} maxLength={80} />
            </div>
            <div>
              <label className={labelClass}>{t('local.phone')}</label>
              <input className="field-input" value={form.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required pattern="[6-9][0-9]{9}" inputMode="numeric" placeholder={t('auth.phonePlaceholder')} />
              <p className="mt-1 text-xs text-slate-400">{t('local.phonePrivacy')}</p>
            </div>
            <div>
              <label className={labelClass}>{t('local.categoriesLabel')}</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition-colors', form.categories.includes(c) ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-teal-50')}
                  >
                    {t(`local.categories.${c}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>{t('local.experienceYears')}</label>
                <input className="field-input" type="number" min={0} max={60} value={form.experienceYears} onChange={(e) => set({ experienceYears: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>{t('bookings.basePriceLabel')}</label>
                <input className="field-input" type="number" min={50} max={50000} value={form.basePriceRupees} onChange={(e) => set({ basePriceRupees: e.target.value })} required />
              </div>
              <div>
                <label className={labelClass}>{t('local.priceHint')}</label>
                <input className="field-input" value={form.priceHint} onChange={(e) => set({ priceHint: e.target.value })} maxLength={80} placeholder="From ₹299" />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('local.bio')}</label>
              <textarea className="field-input" rows={3} value={form.bio} onChange={(e) => set({ bio: e.target.value })} required minLength={20} maxLength={600} />
            </div>
            <div>
              <label className={labelClass}>{t('local.photoOptional')}</label>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} className="gap-1.5">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {t('report.photos.add')}
                </Button>
                {form.photoUrl && <img src={form.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{t('report.fields.stateLabel')}</label>
                <select className="field-input" value={form.state} onChange={(e) => handleStateChange(e.target.value)}>
                  {INDIA_STATES_AND_UTS.map((s) => (
                    <option key={s.code} value={s.nameEn}>{currentLang(i18n.language) === 'hi' ? s.nameHi : s.nameEn}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('report.fields.cityLabel')}</label>
                <input className="field-input" value={form.city} onChange={(e) => set({ city: e.target.value })} required />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={labelClass}>{t('local.serviceLocation')}</label>
                <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating} className="gap-1.5">
                  {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
                  {t('report.useMyLocation')}
                </Button>
              </div>
              <Suspense fallback={<div className="h-[240px] animate-pulse rounded-xl bg-slate-100" />}>
                <LocationPicker
                  value={{ lat: coords?.lat, lng: coords?.lng }}
                  radiusKm={Number(form.radiusKm)}
                  onChange={(p) => {
                    if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) setCoords({ lat: p.lat, lng: p.lng });
                    const patch = {};
                    for (const f of ['address', 'city', 'state', 'pincode']) if (p[f] !== undefined) patch[f] = p[f];
                    if (Object.keys(patch).length) set(patch);
                  }}
                />
              </Suspense>
              <input className="field-input mt-2" placeholder={t('report.fields.addressLabel')} value={form.address} onChange={(e) => set({ address: e.target.value })} required />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input className="field-input" placeholder={t('report.fields.pincodeLabel')} value={form.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
                <select className="field-input" value={form.radiusKm} onChange={(e) => set({ radiusKm: e.target.value })}>
                  {[2, 5, 10, 15, 25].map((km) => <option key={km} value={km}>{t('local.radiusKm', { km })}</option>)}
                </select>
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-teal-700 hover:bg-teal-800">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('local.registerSubmit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

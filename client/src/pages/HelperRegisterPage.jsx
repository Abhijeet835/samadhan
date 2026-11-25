import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Crosshair, Loader2, Upload } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { forwardGeocode, parseAddressParts, reverseGeocode } from '@/features/global/geocode';
import { uploadPhoto } from '@/features/global/uploadPhoto';
import { LOCAL_CATEGORIES } from '@/features/local/constants';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-teal-500';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

export default function HelperRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    displayName: '', phone: '', categories: [], experienceYears: 0,
    bio: '', priceHint: '', address: '', city: '', state: '', pincode: '',
    radiusKm: 5, photoUrl: '',
  });
  const [coords, setCoords] = useState(null);
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    api.get('/helpers/me/dashboard')
      .then(() => navigate('/local/dashboard', { replace: true }))
      .catch(() => setChecking(false));
  }, [navigate]);

  function toggleCategory(category) {
    setForm((prev) => {
      const has = prev.categories.includes(category);
      if (has) return { ...prev, categories: prev.categories.filter((c) => c !== category) };
      if (prev.categories.length >= 4) return prev;
      return { ...prev, categories: [...prev.categories, category] };
    });
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
        } catch { /* manual entry still works */ }
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
    setSubmitting(true);
    try {
      let position = coords;
      if (!position) {
        const query = [form.address, form.city, form.state, form.pincode].filter(Boolean).join(', ');
        const result = await forwardGeocode(query);
        if (!result) {
          toast.error(t('report.geocodeFailed'));
          return;
        }
        position = { lat: Number(result.lat), lng: Number(result.lon) };
      }
      await api.post('/helpers', {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        categories: form.categories,
        experienceYears: Number(form.experienceYears),
        bio: form.bio.trim(),
        priceHint: form.priceHint.trim(),
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
      navigate('/local/dashboard');
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'HELPER_PROFILE_EXISTS') navigate('/local/dashboard');
      else toast.error(err.response?.data?.error?.message ?? t('local.registerFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return <div className="mx-auto max-w-2xl px-4 py-8"><div className="h-96 animate-pulse rounded-xl bg-teal-100/50" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">{t('local.registerTitle')}</h1>
      <p className="mt-2 text-slate-600">{t('local.registerSubtitle')}</p>

      <Card className="mt-6 border-teal-100">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className={labelClass}>{t('local.displayName')}</label>
              <input className={inputClass} value={form.displayName} onChange={(e) => set({ displayName: e.target.value })} required minLength={2} maxLength={80} />
            </div>
            <div>
              <label className={labelClass}>{t('local.phone')}</label>
              <input className={inputClass} value={form.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} required pattern="[6-9][0-9]{9}" inputMode="numeric" placeholder={t('auth.phonePlaceholder')} />
              <p className="mt-1 text-xs text-slate-400">{t('local.phonePrivacy')}</p>
            </div>
            <div>
              <label className={labelClass}>{t('local.categoriesLabel')}</label>
              <div className="flex flex-wrap gap-1.5">
                {LOCAL_CATEGORIES.map((c) => (
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('local.experienceYears')}</label>
                <input className={inputClass} type="number" min={0} max={60} value={form.experienceYears} onChange={(e) => set({ experienceYears: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>{t('local.priceHint')}</label>
                <input className={inputClass} value={form.priceHint} onChange={(e) => set({ priceHint: e.target.value })} maxLength={80} placeholder="From ₹300" />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('local.bio')}</label>
              <textarea className={inputClass} rows={4} value={form.bio} onChange={(e) => set({ bio: e.target.value })} required minLength={20} maxLength={600} />
            </div>

            <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating} className="gap-2 border-teal-200 text-teal-800">
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                {t('report.useMyLocation')}
              </Button>
              <div className="mt-3 space-y-3">
                <div>
                  <label className={labelClass}>{t('report.fields.addressLabel')}</label>
                  <input className={inputClass} value={form.address} onChange={(e) => { set({ address: e.target.value }); setCoords(null); }} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t('report.fields.cityLabel')}</label>
                    <input className={inputClass} value={form.city} onChange={(e) => set({ city: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>{t('local.radiusLabel')}</label>
                    <select className={inputClass} value={form.radiusKm} onChange={(e) => set({ radiusKm: e.target.value })}>
                      {Array.from({ length: 25 }, (_, i) => i + 1).map((km) => <option key={km} value={km}>{km} km</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {form.photoUrl ? t('local.photoSet') : t('local.addPhoto')}
              </Button>
            </div>

            <Button type="submit" disabled={submitting || form.categories.length === 0} className="w-full gap-2 bg-teal-700 hover:bg-teal-800">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('local.submitRegister')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

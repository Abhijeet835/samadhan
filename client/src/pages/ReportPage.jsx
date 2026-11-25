import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, Crosshair, Flame, HandCoins, Loader2, Upload, X } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatPaise } from '@/features/wallet/money';
import { IMPORTANCE_LEVELS, ISSUE_CATEGORIES, ISSUE_TYPES } from '@/features/global/constants';
import { uploadPhoto } from '@/features/global/uploadPhoto';
import { forwardGeocode, parseAddressParts, reverseGeocode } from '@/features/global/geocode';
import DuplicateDialog from '@/features/global/DuplicateDialog';
import { Dialog } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { saveDraft, loadDraft, clearDraft } from '@/lib/draftStorage';
import { INDIA_STATES_AND_UTS, getCitiesForState } from '@/lib/indiaLocations';

const LocationPicker = lazy(() => import('@/features/maps/LocationPicker'));
const STEPS = ['details', 'location', 'photos', 'confirm'];
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';
const errorClass = 'mt-1 text-xs font-medium text-red-600';

export default function ReportPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState({
    reportFeePaise: 500,
    maxPhotos: 3,
    importanceThresholds: { SMALL: 5, MEDIUM: 15, LARGE: 30 },
    poolGoalDefaults: { SMALL: 50000, MEDIUM: 250000, LARGE: 1000000 },
  });
  const [wallet, setWallet] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [insufficient, setInsufficient] = useState(false);
  const [duplicate, setDuplicate] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    issueType: 'SOCIAL_EXPLOSION',
    importance: 'MEDIUM',
    fundingGoalRupees: '2500',
    responsibleOrgName: '',
    responsibleOrgType: 'NGO',
    address: '',
    city: '',
    state: 'Karnataka',
    pincode: '',
  });
  const [coords, setCoords] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [touched, setTouched] = useState(false);

  const idempotencyKeyRef = useRef(`report:${crypto.randomUUID()}`);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const [resumeDraft, setResumeDraft] = useState(null);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const d = loadDraft(user?._id);
    if (d && (d.title || d.description)) setResumeDraft(d);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [user?._id]);

  useEffect(() => {
    const id = setTimeout(() => {
      saveDraft(user?._id, {
        category: form.category,
        issueType: form.issueType,
        importance: form.importance,
        title: form.title,
        description: form.description,
        location: coords ? { coordinates: [coords.lng, coords.lat], address: form.address, city: form.city, state: form.state, pincode: form.pincode } : null,
        step,
      });
    }, 500);
    return () => clearTimeout(id);
  }, [form, coords, step, user?._id]);

  function applyDraft(d) {
    setForm((prev) => ({
      ...prev,
      title: d.title ?? '',
      description: d.description ?? '',
      category: d.category ?? '',
      issueType: d.issueType || prev.issueType,
      importance: d.importance || prev.importance,
      address: d.location?.address ?? '',
      city: d.location?.city ?? '',
      state: d.location?.state || prev.state,
      pincode: d.location?.pincode ?? '',
    }));
    if (d.location?.coordinates) setCoords({ lng: d.location.coordinates[0], lat: d.location.coordinates[1] });
    setStep(d.step ?? 0);
    setResumeDraft(null);
  }

  useEffect(() => {
    api.get('/issues/meta').then((res) => setMeta((prev) => ({ ...prev, ...res.data }))).catch(() => {});
    api.get('/wallet').then((res) => setWallet(res.data.wallet)).catch(() => {});
  }, []);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const stepValid = [
    form.title.trim().length >= 5 && form.title.trim().length <= 150 &&
      form.description.trim().length >= 20 && !!form.category,
    form.address.trim().length >= 3 && !!form.state && form.city.trim().length >= 2 &&
      (form.pincode === '' || /^\d{6}$/.test(form.pincode)),
    true,
    true,
  ][step];

  function handleStateChange(nextState) {
    const cities = getCitiesForState(nextState);
    const firstCity = cities[0];
    set({
      state: nextState,
      city: firstCity?.nameEn ?? '',
      pincode: firstCity?.pincode ?? '',
    });
    if (firstCity) {
      setCoords({ lng: firstCity.lng, lat: firstCity.lat });
    }
    setGeocodeFailed(false);
  }

  function handleCityPreset(cityName) {
    const cities = getCitiesForState(form.state);
    const match = cities.find((c) => c.nameEn === cityName);
    set({ city: cityName, ...(match?.pincode ? { pincode: match.pincode } : {}) });
    if (match) setCoords({ lng: match.lng, lat: match.lat });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error(t('report.locationUnsupported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lng: longitude, lat: latitude });
        try {
          const result = await reverseGeocode(latitude, longitude);
          const parts = parseAddressParts(result);
          set({
            ...(parts.address && { address: parts.address }),
            ...(parts.city && { city: parts.city }),
            ...(parts.state && { state: parts.state }),
            ...(parts.pincode && { pincode: parts.pincode }),
          });
        } catch { /* coordinates enough */ }
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

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('report.photos.invalidType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('report.photos.tooLarge'));
      return;
    }
    setUploadingPhoto(true);
    try {
      const { url } = await uploadPhoto(file);
      setPhotos((prev) => [...prev, url].slice(0, meta.maxPhotos));
      toast.success(t('report.photos.uploaded'));
    } catch (error) {
      const code = error.response?.data?.error?.code;
      toast.error(code === 'CLOUDINARY_NOT_CONFIGURED' ? t('report.photos.unavailable') : t('report.photos.failed'));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(force = false) {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setInsufficient(false);
    try {
      const goalPaise = form.issueType === 'POOL_FUNDS'
        ? Math.max(500, Math.round((Number(form.fundingGoalRupees) || 500) * 100))
        : 0;
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        issueType: form.issueType,
        importance: form.importance,
        fundingGoalPaise: goalPaise,
        ...(form.issueType === 'POOL_FUNDS' && form.responsibleOrgName.trim()
          ? {
              responsibleParty: {
                type: form.responsibleOrgType,
                name: form.responsibleOrgName.trim(),
              },
            }
          : {}),
        photos,
        location: {
          country: 'India',
          coordinates: [coords.lng, coords.lat],
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        },
        idempotencyKey: idempotencyKeyRef.current,
        force,
      };
      const response = await api.post('/issues', payload);
      toast.success(t('report.success'));
      clearDraft(user?._id);
      navigate(`/issues/${response.data.issue._id}`);
    } catch (error) {
      const code = error.response?.data?.error?.code;
      if (code === 'DUPLICATE_FOUND') {
        setDuplicate(error.response.data.error.existingIssue);
      } else if (code === 'INSUFFICIENT_BALANCE') {
        setInsufficient(true);
        setSubmitError(t('report.insufficient'));
      } else {
        setSubmitError(t('report.submitFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const next = async () => {
    if (!stepValid) {
      setTouched(true);
      return;
    }
    if (step === 1 && !coords) {
      setGeocoding(true);
      setGeocodeFailed(false);
      try {
        const query = [form.address, form.city, form.state, 'India', form.pincode]
          .map((v) => v.trim())
          .filter(Boolean)
          .join(', ');
        const result = await forwardGeocode(query);
        if (!result) {
          setGeocodeFailed(true);
          setTouched(true);
          return;
        }
        setCoords({ lng: Number(result.lon), lat: Number(result.lat) });
      } catch {
        setGeocodeFailed(true);
        setTouched(true);
        return;
      } finally {
        setGeocoding(false);
      }
    }
    setTouched(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const fee = meta.reportFeePaise;
  const stateCities = getCitiesForState(form.state);

  return (
    <div className="min-h-screen bg-slate-50/70 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('report.title')}</h1>
          <p className="mt-2 text-slate-600">{t('report.subtitle')}</p>
          {offline && (
            <p className="mt-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white" role="status">{t('offline.draftSaved')}</p>
          )}
        </div>

        <ol className="mb-6 flex items-center gap-2" aria-label={t('report.stepsAria')}>
          {STEPS.map((key, index) => (
            <li key={key} className="flex flex-1 flex-col gap-1">
              <div className={cn('h-1.5 rounded-full transition-colors', index <= step ? 'bg-blue-600' : 'bg-slate-200')} />
              <span className={cn('text-xs font-semibold', index <= step ? 'text-blue-700' : 'text-slate-400')}>
                {t(`report.steps.${key}`)}
              </span>
            </li>
          ))}
        </ol>

        <Card>
          <CardContent className="pt-6">
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <p className={labelClass}>{t('report.fields.typeLabel')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ISSUE_TYPES.map((typeKey) => {
                      const active = form.issueType === typeKey;
                      const Icon = typeKey === 'POOL_FUNDS' ? HandCoins : Flame;
                      return (
                        <button
                          key={typeKey}
                          type="button"
                          onClick={() => set({ issueType: typeKey })}
                          className={cn(
                            'flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
                            active
                              ? typeKey === 'POOL_FUNDS'
                                ? 'border-teal-700 bg-teal-50/60 ring-1 ring-teal-700'
                                : 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                              : 'border-slate-200 bg-white hover:bg-slate-50',
                          )}
                        >
                          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{t(`issues.types.${typeKey}`)}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{t(`report.fields.typeDesc.${typeKey}`)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className={labelClass}>{t('report.fields.importanceLabel')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {IMPORTANCE_LEVELS.map((lvl) => {
                      const active = form.importance === lvl;
                      const supTarget = meta.importanceThresholds?.[lvl] ?? 15;
                      const goalDefault = meta.poolGoalDefaults?.[lvl] ?? 250000;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() =>
                            set({
                              importance: lvl,
                              fundingGoalRupees: String(Math.round(goalDefault / 100)),
                            })
                          }
                          className={cn(
                            'rounded-xl border p-2.5 text-center transition',
                            active ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:bg-slate-50',
                          )}
                        >
                          <p className="text-xs font-bold">{t(`issues.importance.${lvl}`)}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {form.issueType === 'POOL_FUNDS'
                              ? formatPaise(goalDefault, i18n.language)
                              : t('report.fields.supportersTarget', { count: supTarget })}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.issueType === 'POOL_FUNDS' && (
                  <div className="grid gap-3 rounded-xl border border-teal-100 bg-teal-50/40 p-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="pool-goal" className="mb-1 block text-xs font-semibold text-slate-700">
                        {t('report.fields.goalLabel')}
                      </label>
                      <input
                        id="pool-goal"
                        type="number"
                        min="10"
                        max="500000"
                        className="field-input"
                        value={form.fundingGoalRupees}
                        onChange={(e) => set({ fundingGoalRupees: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="resp-org" className="mb-1 block text-xs font-semibold text-slate-700">
                        {t('report.fields.responsibleOrgLabel')}
                      </label>
                      <input
                        id="resp-org"
                        type="text"
                        className="field-input"
                        placeholder={t('report.fields.responsibleOrgPlaceholder')}
                        value={form.responsibleOrgName}
                        onChange={(e) => set({ responsibleOrgName: e.target.value })}
                      />
                    </div>
                    <p className="text-[11px] leading-snug text-teal-800 sm:col-span-2">
                      {t('report.fields.poolHint')}
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="issue-title" className={labelClass}>{t('report.fields.titleLabel')}</label>
                  <input
                    id="issue-title"
                    type="text"
                    maxLength={150}
                    value={form.title}
                    onChange={(e) => set({ title: e.target.value })}
                    placeholder={t('report.fields.titlePlaceholder')}
                    className="field-input"
                  />
                  {touched && form.title.trim().length < 5 && (
                    <p className={errorClass}>{t('report.validation.title')}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="issue-description" className={labelClass}>{t('report.fields.descLabel')}</label>
                  <textarea
                    id="issue-description"
                    rows={4}
                    maxLength={2000}
                    value={form.description}
                    onChange={(e) => set({ description: e.target.value })}
                    placeholder={t('report.fields.descPlaceholder')}
                    className="field-input"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>{form.description.trim().length}/2000</span>
                    <span>{t('report.fields.descHint')}</span>
                  </div>
                  {touched && form.description.trim().length < 20 && (
                    <p className={errorClass}>{t('report.validation.description')}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="issue-category" className={labelClass}>{t('report.fields.categoryLabel')}</label>
                  <select
                    id="issue-category"
                    value={form.category}
                    onChange={(e) => set({ category: e.target.value })}
                    className="field-input"
                  >
                    <option value="">{t('report.fields.categoryPlaceholder')}</option>
                    {ISSUE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{t(`issues.categories.${c}`)}</option>
                    ))}
                  </select>
                  {touched && !form.category && <p className={errorClass}>{t('report.validation.category')}</p>}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs font-medium text-blue-900">
                  {t('report.indiaHierarchyNote')}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="issue-state" className={labelClass}>{t('report.fields.stateLabel')}</label>
                    <select
                      id="issue-state"
                      value={form.state}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="field-input"
                    >
                      {INDIA_STATES_AND_UTS.map((s) => (
                        <option key={s.code} value={s.nameEn}>
                          {i18n.language === 'hi' ? s.nameHi : s.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="issue-city" className={labelClass}>{t('report.fields.cityLabel')}</label>
                    <input
                      id="issue-city"
                      list="india-city-suggestions"
                      type="text"
                      value={form.city}
                      onChange={(e) => handleCityPreset(e.target.value)}
                      className="field-input"
                      placeholder={stateCities[0]?.nameEn || ''}
                    />
                    <datalist id="india-city-suggestions">
                      {stateCities.map((c) => (
                        <option key={c.nameEn} value={c.nameEn} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <Suspense fallback={<div className="h-[280px] animate-pulse rounded-xl bg-slate-100" />}>
                  <LocationPicker
                    value={{ lat: coords?.lat, lng: coords?.lng }}
                    onChange={(p) => {
                      if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) setCoords({ lng: p.lng, lat: p.lat });
                      const patch = {};
                      for (const f of ['address', 'city', 'state', 'pincode']) if (p[f] !== undefined) patch[f] = p[f];
                      if (Object.keys(patch).length) set(patch);
                      setGeocodeFailed(false);
                    }}
                  />
                </Suspense>

                <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating} className="gap-2">
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                  {locating ? t('report.locating') : t('report.useMyLocation')}
                </Button>

                <div>
                  <label htmlFor="issue-address" className={labelClass}>{t('report.fields.addressLabel')}</label>
                  <input
                    id="issue-address"
                    type="text"
                    value={form.address}
                    onChange={(e) => {
                      set({ address: e.target.value });
                      setGeocodeFailed(false);
                    }}
                    className="field-input"
                  />
                  <p className="mt-1 text-xs text-slate-400">{t('report.locationHint')}</p>
                </div>

                <div>
                  <label htmlFor="issue-pincode" className={labelClass}>{t('report.fields.pincodeLabel')}</label>
                  <input
                    id="issue-pincode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode}
                    onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, '') })}
                    className="field-input"
                  />
                  {touched && form.pincode && !/^\d{6}$/.test(form.pincode) && (
                    <p className={errorClass}>{t('report.validation.pincode')}</p>
                  )}
                </div>

                {coords && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('report.locationSet')}
                  </p>
                )}
                {touched && !stepValid && <p className={errorClass}>{t('report.validation.location')}</p>}
                {geocodeFailed && <p className={errorClass}>{t('report.geocodeFailed')}</p>}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{t('report.photos.hint')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoSelected}
                />
                {photos.length < meta.maxPhotos && (
                  <Button type="button" variant="outline" disabled={uploadingPhoto} onClick={() => fileInputRef.current?.click()} className="gap-2">
                    {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingPhoto ? t('report.photos.uploading') : t('report.photos.add')}
                  </Button>
                )}
                {photos.length > 0 && (
                  <ul className="grid grid-cols-3 gap-3">
                    {photos.map((url) => (
                      <li key={url} className="relative">
                        <img src={url} alt="" className="h-24 w-full rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                          className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white"
                          aria-label={t('report.photos.remove')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm">
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-600">{t('report.fields.typeLabel')}</dt>
                    <dd className="font-semibold text-slate-900">{t(`issues.types.${form.issueType}`)} ({t(`issues.importance.${form.importance}`)})</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-600">{t('report.confirm.feeLabel')}</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">−{formatPaise(fee, i18n.language)}</dd>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <dt className="text-slate-600">{t('report.confirm.balanceLabel')}</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">
                      {wallet ? formatPaise(wallet.balancePaise, i18n.language) : t('common.loading')}
                    </dd>
                  </div>
                  {wallet && (
                    <div className="flex justify-between py-2.5">
                      <dt className="text-slate-600">{t('report.confirm.afterLabel')}</dt>
                      <dd className={cn('font-semibold tabular-nums', wallet.balancePaise - fee < 0 ? 'text-red-600' : 'text-emerald-700')}>
                        {formatPaise(Math.max(0, wallet.balancePaise - fee), i18n.language)}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t('report.confirm.disclaimer')}
                  </p>
                </div>

                {submitError && (
                  <p role="alert" className="text-sm font-medium text-red-600">{submitError}</p>
                )}
                {insufficient && (
                  <Link to="/wallet">
                    <Button variant="outline" size="sm">{t('report.openWallet')}</Button>
                  </Link>
                )}

                <Button type="button" onClick={() => handleSubmit()} disabled={submitting || offline} title={offline ? t('offline.submitDisabled') : undefined} className="w-full gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!submitting && <Check className="h-4 w-4" />}
                  {submitting ? t('common.loading') : t('report.confirm.submit')}
                </Button>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
                {t('report.back')}
              </Button>
              {step < STEPS.length - 1 && (
                <Button type="button" onClick={next} disabled={geocoding} className="gap-2">
                  {geocoding && <Loader2 className="h-4 w-4 animate-spin" />}
                  {geocoding ? t('report.geocoding') : t('report.next')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <DuplicateDialog
          duplicate={duplicate}
          onClose={() => setDuplicate(null)}
          onForce={() => {
            setDuplicate(null);
            handleSubmit(true);
          }}
          forcing={submitting}
        />

        <Dialog open={!!resumeDraft} onClose={() => setResumeDraft(null)} title={t('draft.resumeTitle')}>
          <p className="text-sm text-slate-600">{t('draft.resumeBody')}</p>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" onClick={() => applyDraft(resumeDraft)}>{t('draft.resume')}</Button>
            <Button variant="outline" className="flex-1" onClick={() => { clearDraft(user?._id); setResumeDraft(null); }}>{t('draft.discard')}</Button>
          </div>
        </Dialog>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, Crosshair, Loader2, Upload, X } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatPaise } from '@/features/wallet/money';
import { ISSUE_CATEGORIES } from '@/features/global/constants';
import { uploadPhoto } from '@/features/global/uploadPhoto';
import { forwardGeocode, parseAddressParts, reverseGeocode } from '@/features/global/geocode';
import DuplicateDialog from '@/features/global/DuplicateDialog';
import WhyRupee from '@/features/global/WhyRupee';

const STEPS = ['details', 'location', 'photos', 'confirm'];

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500';
const labelClass = 'mb-1 block text-sm font-medium text-slate-700';
const errorClass = 'mt-1 text-xs font-medium text-red-600';

export default function ReportPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState({ reportFeePaise: 500, maxPhotos: 3 });
  const [wallet, setWallet] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [insufficient, setInsufficient] = useState(false);
  const [duplicate, setDuplicate] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [coords, setCoords] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const [touched, setTouched] = useState(false);

  // One key per wizard session: a failed submit retried later reuses it and
  // can never double-charge.
  const idempotencyKeyRef = useRef(`report:${crypto.randomUUID()}`);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/issues/meta').then((res) => setMeta(res.data)).catch(() => {});
    api.get('/wallet').then((res) => setWallet(res.data.wallet)).catch(() => {});
  }, []);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const stepValid = [
    form.title.trim().length >= 5 && form.title.trim().length <= 150 &&
      form.description.trim().length >= 20 && !!form.category,
    form.address.trim().length >= 3 &&
      (form.pincode === '' || /^\d{6}$/.test(form.pincode)),
    true,
    true,
  ][step];

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
        } catch {
          // Coordinates are set; the user can type the address manually.
        }
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
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        photos,
        location: {
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
        const query = [form.address, form.city, form.state, form.pincode]
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

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">{t('report.title')}</h1>
          <p className="mt-2 text-slate-600">{t('report.subtitle')}</p>
        </div>

        {/* Step indicator */}
        <ol className="mb-6 flex items-center gap-2" aria-label={t('report.stepsAria')}>
          {STEPS.map((key, index) => (
            <li key={key} className="flex flex-1 flex-col gap-1">
              <div
                className={cn(
                  'h-1.5 rounded-full',
                  index <= step ? 'bg-blue-600' : 'bg-slate-200',
                )}
              />
              <span className={cn('text-xs font-medium', index <= step ? 'text-blue-700' : 'text-slate-400')}>
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
                  <label htmlFor="issue-title" className={labelClass}>{t('report.fields.titleLabel')}</label>
                  <input
                    id="issue-title"
                    type="text"
                    maxLength={150}
                    value={form.title}
                    onChange={(e) => set({ title: e.target.value })}
                    placeholder={t('report.fields.titlePlaceholder')}
                    className={inputClass}
                  />
                  {touched && form.title.trim().length < 5 && (
                    <p className={errorClass}>{t('report.validation.title')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="issue-description" className={labelClass}>{t('report.fields.descLabel')}</label>
                  <textarea
                    id="issue-description"
                    rows={5}
                    maxLength={2000}
                    value={form.description}
                    onChange={(e) => set({ description: e.target.value })}
                    placeholder={t('report.fields.descPlaceholder')}
                    className={inputClass}
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
                    className={inputClass}
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
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-400">{t('report.locationHint')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="issue-city" className={labelClass}>{t('report.fields.cityLabel')}</label>
                    <input id="issue-city" type="text" value={form.city} onChange={(e) => set({ city: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="issue-state" className={labelClass}>{t('report.fields.stateLabel')}</label>
                    <input id="issue-state" type="text" value={form.state} onChange={(e) => set({ state: e.target.value })} className={inputClass} />
                  </div>
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
                    className={inputClass}
                  />
                  {touched && form.pincode && !/^\d{6}$/.test(form.pincode) && (
                    <p className={errorClass}>{t('report.validation.pincode')}</p>
                  )}
                </div>
                {coords && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-green-700">
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
                <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm">
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-600">{t('report.confirm.feeLabel')}</dt>
                    <dd className="font-semibold text-slate-900 tabular-nums">−{formatPaise(fee, i18n.language)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-600">{t('report.confirm.balanceLabel')}</dt>
                    <dd className="font-semibold text-slate-900 tabular-nums">
                      {wallet ? formatPaise(wallet.balancePaise, i18n.language) : t('common.loading')}
                    </dd>
                  </div>
                  {wallet && (
                    <div className="flex justify-between py-2">
                      <dt className="text-slate-600">{t('report.confirm.afterLabel')}</dt>
                      <dd
                        className={cn(
                          'font-semibold tabular-nums',
                          wallet.balancePaise - fee < 0 ? 'text-red-600' : 'text-green-700',
                        )}
                      >
                        {formatPaise(Math.max(0, wallet.balancePaise - fee), i18n.language)}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    {t('report.confirm.disclaimer')}
                  </p>
                </div>

                <WhyRupee compact />

                {submitError && (
                  <p role="alert" className="text-sm font-medium text-red-600">{submitError}</p>
                )}
                {insufficient && (
                  <Link to="/wallet">
                    <Button variant="outline" size="sm">{t('report.openWallet')}</Button>
                  </Link>
                )}

                <Button type="button" onClick={() => handleSubmit()} disabled={submitting} className="w-full gap-2">
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
      </div>
    </div>
  );
}
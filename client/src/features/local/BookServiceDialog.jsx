import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CalendarCheck, Loader2 } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatPaise } from '@/features/wallet/money';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/errors';

const TIME_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
  '06:00 PM - 08:00 PM',
];

export default function BookServiceDialog({ helper, open, onClose, onBooked }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [serviceTitle, setServiceTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState(tomorrow);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [address, setAddress] = useState(user?.homeLocation?.address || '');
  const [city, setCity] = useState(helper?.serviceLocation?.city || user?.homeLocation?.city || '');
  const [state, setState] = useState(helper?.serviceLocation?.state || user?.homeLocation?.state || '');
  const [notes, setNotes] = useState('');
  const [balance, setBalance] = useState(null);
  const [pending, setPending] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  const keyRef = useRef(null);

  const amountPaise = helper?.basePricePaise ?? 29900;

  useEffect(() => {
    if (!open) return;
    keyRef.current = `booking:${crypto.randomUUID()}`;
    setInsufficient(false);
    setNotes('');
    setAddress((prev) => prev || user?.homeLocation?.address || '');
    setServiceTitle(helper?.displayName?.split('—')[0]?.trim() || t(`local.categories.${helper?.categories?.[0] || 'OTHER_LOCAL'}`));
    setCity(helper?.serviceLocation?.city || user?.homeLocation?.city || '');
    setState(helper?.serviceLocation?.state || user?.homeLocation?.state || '');
    if (isAuthenticated) {
      api.get('/wallet').then((res) => setBalance(res.data.wallet.balancePaise)).catch(() => {});
    }
  }, [open, helper, isAuthenticated, user, t]);

  async function submit(e) {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (pending) return;
    setPending(true);
    setInsufficient(false);
    try {
      const res = await api.post('/bookings', {
        helperId: helper._id,
        category: helper.categories?.[0],
        serviceTitle: serviceTitle.trim(),
        scheduledDate,
        timeSlot,
        serviceAddress: { address: address.trim(), city: city.trim(), state: state.trim() },
        notes: notes.trim(),
        amountPaise,
        idempotencyKey: keyRef.current,
      });
      toast.success(t('bookings.createdSuccess'));
      onClose();
      onBooked?.(res.data.booking);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'INSUFFICIENT_BALANCE') {
        setInsufficient(true);
      } else {
        toast.error(getErrorMessage(err, t));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => !pending && onClose()} title={t('bookings.dialogTitle')}>
      {!isAuthenticated ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{t('bookings.loginRequired')}</p>
          <Button className="w-full bg-teal-700 hover:bg-teal-800" onClick={() => navigate('/login', { state: { from: location.pathname } })}>
            {t('nav.login')}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3.5">
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-sm">
            <p className="font-bold text-slate-900">{helper?.displayName}</p>
            <p className="mt-0.5 flex items-center justify-between text-xs text-slate-600">
              <span>{t('bookings.estimatedFee')}</span>
              <span className="font-bold tabular-nums text-teal-800">{formatPaise(amountPaise, i18n.language)}</span>
            </p>
            {balance !== null && (
              <p className="mt-0.5 flex items-center justify-between text-xs text-slate-500">
                <span>{t('support.balanceLabel')}</span>
                <span className="tabular-nums">{formatPaise(balance, i18n.language)}</span>
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">{t('bookings.serviceLabel')}</label>
            <input required minLength={2} className="field-input" value={serviceTitle} onChange={(e) => setServiceTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">{t('bookings.dateLabel')}</label>
              <input required type="date" min={new Date().toISOString().slice(0, 10)} className="field-input" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">{t('bookings.slotLabel')}</label>
              <select className="field-input" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">{t('bookings.addressLabel')}</label>
            <input required minLength={3} className="field-input" placeholder={t('bookings.addressPlaceholder')} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <input className="field-input" placeholder={t('report.fields.cityLabel')} value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="field-input" placeholder={t('report.fields.stateLabel')} value={state} onChange={(e) => setState(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">{t('bookings.notesLabel')}</label>
            <textarea rows={2} maxLength={400} className="field-input" placeholder={t('bookings.notesPlaceholder')} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {(insufficient || (balance !== null && balance < amountPaise)) && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <p className="font-semibold">{t('support.insufficient')}</p>
              <Link to="/wallet" className="mt-1 inline-block font-bold underline">{t('support.goToWallet')}</Link>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>{t('common.cancel')}</Button>
            <Button
              type="submit"
              disabled={pending || (balance !== null && balance < amountPaise)}
              className="gap-1.5 bg-teal-700 hover:bg-teal-800"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
              {t('bookings.confirmCta', { amount: formatPaise(amountPaise, i18n.language) })}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

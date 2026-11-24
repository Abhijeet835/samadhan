import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, HeartHandshake, Loader2, LogIn } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatPaise } from '@/features/wallet/money';
import { useIssueMeta } from './useIssueMeta';

/**
 * Paid +1 support with every viewer state: logged out, reporter, already
 * supported, unsupportable status, insufficient balance, and the happy path.
 * Renders a sidebar card plus a sticky mobile action bar.
 */
export default function SupportPanel({ issue, viewer, onSupported, onReload }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const meta = useIssueMeta();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState(null);
  const [balance, setBalance] = useState(null);
  // One key per dialog session, reused across retries of the same intent.
  const keyRef = useRef(null);

  useEffect(() => {
    if (!viewer.isAuthenticated) return undefined;
    let active = true;
    api
      .get('/wallet')
      .then((res) => {
        if (active) setBalance(res.data.wallet.balancePaise);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [viewer.isAuthenticated]);

  const fee = meta?.supportFeePaise;
  const insufficient = balance !== null && fee !== undefined && balance < fee;

  function openDialog() {
    keyRef.current = `support:${crypto.randomUUID()}`;
    setErrorCode(null);
    setOpen(true);
  }

  function loginToSupport() {
    navigate('/login', { state: { from: location.pathname } });
  }

  async function confirmSupport() {
    if (pending) return;
    setPending(true);
    setErrorCode(null);
    try {
      const res = await api.post(`/issues/${issue._id}/support`, { idempotencyKey: keyRef.current });
      setBalance(res.data.wallet.balancePaise);
      toast.success(t('support.success'));
      setOpen(false);
      onSupported?.(res.data);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'INSUFFICIENT_BALANCE') {
        setErrorCode(code);
      } else if (code === 'ALREADY_SUPPORTED' || code === 'ISSUE_NOT_SUPPORTABLE') {
        toast.error(t(code === 'ALREADY_SUPPORTED' ? 'support.alreadySupported' : 'support.notSupportable'));
        setOpen(false);
        onReload?.();
      } else {
        setErrorCode('GENERIC');
      }
    } finally {
      setPending(false);
    }
  }

  const ctaLabel = fee !== undefined ? t('support.cta', { amount: formatPaise(fee, i18n.language) }) : t('common.loading');

  let panel;
  if (!viewer.isAuthenticated) {
    panel = (
      <Button type="button" className="w-full gap-2" onClick={loginToSupport}>
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {t('support.loginToSupport')}
      </Button>
    );
  } else if (viewer.isReporter) {
    panel = (
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
        {t('issues.detail.youReporter')}
      </p>
    );
  } else if (viewer.hasSupported) {
    panel = (
      <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        <Check className="h-4 w-4" aria-hidden="true" />
        {t('support.youSupported')}
      </p>
    );
  } else if (!viewer.canSupport) {
    panel = <p className="text-sm text-slate-400">{t('support.notSupportable')}</p>;
  } else {
    panel = (
      <Button type="button" className="w-full gap-2" onClick={openDialog}>
        <HeartHandshake className="h-4 w-4" aria-hidden="true" />
        {ctaLabel}
      </Button>
    );
  }

  const showSticky = !viewer.isAuthenticated || viewer.canSupport;

  return (
    <>
      {panel}

      {showSticky && (
        <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">{t('issues.fundLabel')}</p>
              <p className="text-sm font-bold text-slate-900 tabular-nums">
                {formatPaise(issue.fundPaise, i18n.language)}
              </p>
            </div>
            {viewer.isAuthenticated ? (
              <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={openDialog}>
                <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                {ctaLabel}
              </Button>
            ) : (
              <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={loginToSupport}>
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {t('support.loginToSupport')}
              </Button>
            )}
          </div>
        </div>
      )}

      <Dialog open={open} onClose={() => !pending && setOpen(false)} title={t('support.dialogTitle')}>
        <p className="mb-4 text-sm text-slate-600">{t('support.dialogSubtitle', { title: issue.title })}</p>
        <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-slate-600">{t('support.feeLabel')}</dt>
            <dd className="font-semibold text-slate-900 tabular-nums">
              {fee !== undefined ? `−${formatPaise(fee, i18n.language)}` : t('common.loading')}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-slate-600">{t('support.balanceLabel')}</dt>
            <dd className="font-semibold text-slate-900 tabular-nums">
              {balance !== null ? formatPaise(balance, i18n.language) : t('common.loading')}
            </dd>
          </div>
          {balance !== null && fee !== undefined && (
            <div className="flex justify-between py-2">
              <dt className="text-slate-600">{t('support.afterLabel')}</dt>
              <dd className={cn('font-semibold tabular-nums', insufficient ? 'text-red-600' : 'text-green-700')}>
                {formatPaise(Math.max(0, balance - fee), i18n.language)}
              </dd>
            </div>
          )}
        </dl>

        <p className="mt-3 text-xs text-slate-400">{t('report.confirm.disclaimer')}</p>

        {errorCode === 'INSUFFICIENT_BALANCE' && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {t('report.insufficient')}
            <Link to="/wallet" className="ml-2 font-semibold underline">
              {t('report.openWallet')}
            </Link>
          </div>
        )}
        {errorCode === 'GENERIC' && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">{t('support.failed')}</p>
        )}

        <Button
          type="button"
          className="mt-4 w-full gap-2"
          disabled={pending || insufficient || fee === undefined}
          onClick={confirmSupport}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? t('support.pending') : t('support.confirm')}
        </Button>
      </Dialog>
    </>
  );
}

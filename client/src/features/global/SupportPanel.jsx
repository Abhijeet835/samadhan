import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Check, HandCoins, HeartHandshake, Loader2, LogIn } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatPaise } from '@/features/wallet/money';
import { useIssueMeta } from './useIssueMeta';

const POOL_PACKS = [1000, 5000, 10000, 25000]; // ₹10 / ₹50 / ₹100 / ₹250

export default function SupportPanel({ issue, viewer, onSupported, onReload }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const meta = useIssueMeta();

  const isPool = issue.issueType === 'POOL_FUNDS';
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState(null);
  const [balance, setBalance] = useState(null);
  const [poolAmount, setPoolAmount] = useState(5000);
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
    return () => { active = false; };
  }, [viewer.isAuthenticated]);

  const fee = isPool ? poolAmount : (meta?.supportFeePaise ?? 100);
  const insufficient = balance !== null && fee !== undefined && balance < fee;
  const poolGoal = Math.max(100, issue.fundingGoalPaise || issue.thresholdTarget || 50000);
  const poolRaised = issue.fundPaise || 0;
  const poolRemaining = Math.max(0, poolGoal - poolRaised);

  function openDialog() {
    keyRef.current = `support:${crypto.randomUUID()}`;
    setErrorCode(null);
    setOpen(true);
  }

  function loginToSupport() {
    navigate('/login', { state: { from: location.pathname } });
  }

  async function confirmSupport() {
    if (pending || insufficient) return;
    setPending(true);
    setErrorCode(null);
    try {
      const res = await api.post(`/issues/${issue._id}/support`, {
        idempotencyKey: keyRef.current,
        ...(isPool ? { amountPaise: poolAmount } : {}),
      });
      setBalance(res.data.wallet.balancePaise);
      if (res.data.explosionTriggered) {
        toast.success(isPool ? t('meter.goalReachedMsg') : t('meter.explosionReachedMsg'), { duration: 6000 });
      } else {
        toast.success(isPool ? t('support.poolSuccess') : t('support.success'));
      }
      setOpen(false);
      onSupported?.(res.data, fee);
      if (res.data.explosionTriggered || res.data.tierUnlocked?.length) onReload?.();
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

  const ctaLabel = isPool
    ? t('support.poolCta')
    : t('support.cta', { amount: formatPaise(meta?.supportFeePaise ?? 100, i18n.language) });

  let panel;
  if (!viewer.isAuthenticated) {
    panel = (
      <Button type="button" className="w-full gap-2" onClick={loginToSupport}>
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {t('support.loginToSupport')}
      </Button>
    );
  } else if (viewer.isReporter && !isPool) {
    panel = (
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
        {t('issues.detail.youReporter')}
      </p>
    );
  } else if (viewer.hasSupported && !isPool) {
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
      <Button type="button" className={cn('w-full gap-2', isPool && 'bg-teal-700 hover:bg-teal-800')} onClick={openDialog}>
        {isPool ? <HandCoins className="h-4 w-4" aria-hidden="true" /> : <HeartHandshake className="h-4 w-4" aria-hidden="true" />}
        {ctaLabel}
      </Button>
    );
  }

  const showSticky = !viewer.isAuthenticated || viewer.canSupport;

  return (
    <>
      {panel}

      {showSticky && (
        <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">
                {isPool ? t('meter.poolRaisedLabel') : t('meter.supportProgressLabel')}
              </p>
              <p className="text-sm font-bold tabular-nums text-slate-900">
                {isPool ? formatPaise(issue.fundPaise, i18n.language) : `${issue.supporterCount} / ${issue.thresholdTarget || 15}`}
              </p>
            </div>
            {viewer.isAuthenticated ? (
              <Button type="button" size="sm" className={cn('shrink-0 gap-1.5', isPool && 'bg-teal-700 hover:bg-teal-800')} onClick={openDialog}>
                {isPool ? <HandCoins className="h-4 w-4" aria-hidden="true" /> : <HeartHandshake className="h-4 w-4" aria-hidden="true" />}
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

      <Dialog open={open} onClose={() => !pending && setOpen(false)} title={isPool ? t('support.poolDialogTitle') : t('support.dialogTitle')}>
        <p className="mb-4 text-sm text-slate-600">{t('support.dialogSubtitle', { title: issue.title })}</p>

        {isPool && (
          <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-sm">
            <p className="font-bold text-teal-900">{t('support.poolExplainerTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-teal-900/80">{t('support.poolExplainer')}</p>
            <p className="mt-2 text-xs font-semibold tabular-nums text-teal-900">
              {t('support.poolGoalLine', {
                goal: formatPaise(poolGoal, i18n.language),
                raised: formatPaise(poolRaised, i18n.language),
                remaining: formatPaise(poolRemaining, i18n.language),
              })}
            </p>
          </div>
        )}

        {isPool && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('support.chooseAmount')}</p>
            <div className="grid grid-cols-4 gap-2">
              {POOL_PACKS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPoolAmount(amt)}
                  className={cn(
                    'rounded-xl border px-2 py-2 text-xs font-bold transition',
                    poolAmount === amt
                      ? 'border-teal-700 bg-teal-50 text-teal-800 ring-1 ring-teal-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {formatPaise(amt, i18n.language)}
                </button>
              ))}
            </div>
          </div>
        )}

        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-slate-600">{isPool ? t('support.contributionAmount') : t('support.feeLabel')}</dt>
            <dd className="font-bold tabular-nums text-slate-900">−{formatPaise(fee, i18n.language)}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-slate-600">{t('support.balanceLabel')}</dt>
            <dd className="font-medium tabular-nums text-slate-900">
              {balance !== null ? formatPaise(balance, i18n.language) : '—'}
            </dd>
          </div>
          {balance !== null && (
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-600">{t('support.afterLabel')}</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {formatPaise(Math.max(0, balance - fee), i18n.language)}
              </dd>
            </div>
          )}
        </dl>

        {(insufficient || errorCode === 'INSUFFICIENT_BALANCE') && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">{t('support.insufficient')}</p>
            <Link to="/wallet" className="mt-1 inline-block font-semibold underline">
              {t('support.goToWallet')}
            </Link>
          </div>
        )}

        {errorCode === 'GENERIC' && (
          <p className="mt-3 text-xs font-medium text-red-600">{t('support.failed')}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={pending || insufficient}
            className={cn(isPool && 'bg-teal-700 hover:bg-teal-800')}
            onClick={confirmSupport}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isPool ? t('support.poolConfirm', { amount: formatPaise(fee, i18n.language) }) : t('support.confirm')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

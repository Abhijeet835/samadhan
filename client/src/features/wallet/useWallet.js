import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { formatPaise } from './money';

const FALLBACK_PACKS_PAISE = [1000, 2000, 5000, 10000];

export function useWallet() {
  const { t, i18n } = useTranslation();

  const [wallet, setWallet] = useState(null);
  const [packs, setPacks] = useState(FALLBACK_PACKS_PAISE);
  const [txns, setTxns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [txnsLoading, setTxnsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingPack, setPendingPack] = useState(null);
  const [topupError, setTopupError] = useState(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await api.get('/wallet');
      setWallet(response.data.wallet);
      if (Array.isArray(response.data.topupPacksPaise)) {
        setPacks(response.data.topupPacksPaise);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
      setLoadError(true);
      toast.error(t('wallet.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadTxns = useCallback(async (page = 1) => {
    setTxnsLoading(true);
    try {
      const response = await api.get('/wallet/txns', { params: { page, limit: 10 } });
      setTxns(response.data.txns);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error(t('wallet.errors.loadFailed'));
    } finally {
      setTxnsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // Wallet fetch may lazily create the wallet + SIGNUP_CREDIT row, so the
    // history must load after it to include that first entry.
    loadWallet().then(() => loadTxns(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function topup(amountPaise) {
    if (pendingPack !== null) return;
    setPendingPack(amountPaise);
    setTopupError(null);

    // One key per top-up intent: a retry with the same key can never
    // double-credit, and the button is disabled while the request is in flight.
    const idempotencyKey = `topup:${crypto.randomUUID()}`;

    try {
      const response = await api.post('/wallet/topup', { amountPaise, idempotencyKey });
      setWallet((prev) => ({ ...prev, ...response.data.wallet }));
      toast.success(
        t('wallet.topup.success', { amount: formatPaise(amountPaise, i18n.language) }),
      );
      await loadTxns(1);
    } catch (error) {
      const code = error.response?.data?.error?.code;
      const message =
        code === 'VALIDATION_ERROR'
          ? t('wallet.errors.invalidPack')
          : t('wallet.errors.topupFailed');
      setTopupError(message);
      toast.error(message);
    } finally {
      setPendingPack(null);
    }
  }

  return {
    wallet,
    packs,
    txns,
    pagination,
    loading,
    txnsLoading,
    loadError,
    pendingPack,
    topupError,
    topup,
    loadWallet,
    loadTxns,
  };
}
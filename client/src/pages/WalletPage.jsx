import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import BalanceCard from '@/features/wallet/components/BalanceCard';
import TopupPacks from '@/features/wallet/components/TopupPacks';
import TransactionList from '@/features/wallet/components/TransactionList';
import { useWallet } from '@/features/wallet/useWallet';

export default function WalletPage() {
  const { t } = useTranslation();
  const {
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
  } = useWallet();

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{t('wallet.title')}</h1>
          <p className="mt-2 text-slate-600">{t('wallet.subtitle')}</p>
        </div>

        <div className="space-y-6">
          <BalanceCard balancePaise={wallet?.balancePaise} loading={loading} />

          {loadError && !loading ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm text-red-700">{t('wallet.errors.loadFailed')}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={loadWallet}>
                {t('wallet.retry')}
              </Button>
            </div>
          ) : (
            <TopupPacks
              packs={packs}
              pendingPack={pendingPack}
              topupError={topupError}
              onTopup={topup}
              disabled={loading || loadError}
            />
          )}

          <TransactionList
            txns={txns}
            pagination={pagination}
            loading={txnsLoading}
            onPageChange={loadTxns}
          />
        </div>
      </div>
    </div>
  );
}
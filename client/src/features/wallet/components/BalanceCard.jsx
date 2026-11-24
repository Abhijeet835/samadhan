import { ShieldCheck, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@/components/ui/card';
import { formatPaise } from '../money';

export default function BalanceCard({ balancePaise, loading }) {
  const { t, i18n } = useTranslation();

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-blue-100">
              <Wallet className="h-4 w-4" aria-hidden="true" />
              {t('wallet.balance.label')}
            </p>
            {loading ? (
              <div
                className="mt-3 h-10 w-40 animate-pulse rounded-lg bg-white/25"
                aria-label={t('common.loading')}
              />
            ) : (
              <p className="mt-2 text-4xl font-bold tabular-nums">
                {formatPaise(balancePaise ?? 0, i18n.language)}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-50">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t('wallet.balance.simulated')}
          </span>
        </div>
        <p className="mt-4 text-xs text-blue-100">{t('wallet.balance.note')}</p>
      </CardContent>
    </Card>
  );
}
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatSignedPaise, formatTxnDate } from '../money';

function TxnSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function TransactionList({ txns, pagination, loading, onPageChange }) {
  const { t, i18n } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('wallet.txns.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div aria-label={t('common.loading')}>
            <TxnSkeleton />
            <TxnSkeleton />
            <TxnSkeleton />
          </div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <History className="h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="font-medium text-slate-700">{t('wallet.txns.empty')}</p>
            <p className="text-sm text-slate-500">{t('wallet.txns.emptyHint')}</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {txns.map((txn) => {
                const isCredit = txn.amountPaise > 0;
                return (
                  <li key={txn._id} className="flex items-center gap-3 py-3">
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                      )}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {t(`wallet.txnTypes.${txn.type}`)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTxnDate(txn.createdAt, i18n.language)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        isCredit ? 'text-green-700' : 'text-red-700',
                      )}
                    >
                      {formatSignedPaise(txn.amountPaise, i18n.language)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => onPageChange(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  {t('wallet.txns.prev')}
                </Button>
                <span className="text-xs text-slate-500">
                  {t('wallet.txns.page', { page: pagination.page, total: pagination.totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => onPageChange(pagination.page + 1)}
                >
                  {t('wallet.txns.next')}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
import { Loader2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPaise } from '../money';

export default function TopupPacks({ packs, pendingPack, topupError, onTopup, disabled }) {
  const { t, i18n } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('wallet.topup.title')}</CardTitle>
        <p className="text-sm text-slate-600">{t('wallet.topup.subtitle')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {packs.map((pack) => {
            const isPending = pendingPack === pack;
            return (
              <Button
                key={pack}
                variant="outline"
                className="h-auto flex-col gap-1 py-4"
                disabled={disabled || pendingPack !== null}
                onClick={() => onTopup(pack)}
              >
                <span className="text-lg font-bold tabular-nums">
                  {formatPaise(pack, i18n.language)}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      {t('wallet.topup.pending')}
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('wallet.topup.add')}
                    </>
                  )}
                </span>
              </Button>
            );
          })}
        </div>
        {topupError && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600">
            {topupError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
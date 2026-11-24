import { useTranslation } from 'react-i18next';

import { formatTxnDate } from '@/features/wallet/money';

export default function Timeline({ updates }) {
  const { t, i18n } = useTranslation();

  if (!updates?.length) {
    return <p className="text-sm text-slate-500">{t('issues.detail.timelineEmpty')}</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {updates.map((update) => (
        <li key={update._id} className="relative">
          <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500" />
          <p className="text-sm font-medium text-slate-900">
            {update.fromStatus ? (
              <>
                {t(`issues.statuses.${update.fromStatus}`)} → {t(`issues.statuses.${update.toStatus}`)}
              </>
            ) : (
              t('issues.detail.timelineCreated')
            )}
          </p>
          <p className="text-xs text-slate-500">
            {formatTxnDate(update.createdAt, i18n.language)}
            {update.actorId?.name ? ` · ${update.actorId.name}` : ''}
          </p>
          {update.note && <p className="mt-1 text-sm text-slate-600">{update.note}</p>}
        </li>
      ))}
    </ol>
  );
}
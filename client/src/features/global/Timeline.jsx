import { useTranslation } from 'react-i18next';
import { BadgeIndianRupee, Building2, CheckCircle2, MessageSquare, Receipt } from 'lucide-react';

import { formatTxnDate } from '@/features/wallet/money';

const KIND_META = {
  PLATFORM_CREDIT: { icon: BadgeIndianRupee, color: 'bg-teal-500', label: 'issues.timeline.platformCredit' },
  AUTHORITY_REPLY: { icon: MessageSquare, color: 'bg-violet-500', label: 'issues.timeline.authorityReply' },
  AUTHORITY_ASSIGNED: { icon: Building2, color: 'bg-blue-500', label: 'issues.timeline.authorityAssigned' },
  RESOLUTION_RECORDED: { icon: CheckCircle2, color: 'bg-emerald-600', label: 'issues.timeline.resolutionRecorded' },
  FUND_UTILIZATION: { icon: Receipt, color: 'bg-teal-600', label: 'issues.timeline.fundUtilization' },
};

export default function Timeline({ updates }) {
  const { t, i18n } = useTranslation();

  if (!updates?.length) {
    return <p className="text-sm text-slate-500">{t('issues.detail.timelineEmpty')}</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {updates.map((update) => {
        const kind = update.kind && update.kind !== 'STATUS' ? KIND_META[update.kind] : null;
        const Icon = kind?.icon;
        return (
          <li key={update._id} className="relative">
            <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white ${kind?.color ?? 'bg-blue-500'}`} />
            {kind ? (
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                {t(kind.label)}
                {update.authorityId?.nameEn ? ` · ${update.authorityId.nameEn}` : ''}
              </p>
            ) : (
              <p className="text-sm font-medium text-slate-900">
                {update.fromStatus ? (
                  <>{t(`issues.statuses.${update.fromStatus}`)} → {t(`issues.statuses.${update.toStatus}`)}</>
                ) : (
                  t('issues.detail.timelineCreated')
                )}
              </p>
            )}
            <p className="text-xs text-slate-500">
              {formatTxnDate(update.createdAt, i18n.language)}
              {update.actorId?.name ? ` · ${update.actorId.name}` : ''}
            </p>
            {update.note && <p className="mt-1 text-sm text-slate-600">{update.note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
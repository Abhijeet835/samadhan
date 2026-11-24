import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle2, Clock, FileWarning, MailCheck, MailX } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { formatTxnDate } from '@/features/wallet/money';

const STATUS_META = {
  SENT: { icon: MailCheck, className: 'text-emerald-600', key: 'escalation.sent' },
  SIMULATED: { icon: CheckCircle2, className: 'text-blue-600', key: 'escalation.simulated' },
  PENDING: { icon: Clock, className: 'text-amber-600', key: 'escalation.inProgress' },
  FAILED: { icon: FileWarning, className: 'text-amber-600', key: 'escalation.inProgress' },
  SKIPPED: { icon: Clock, className: 'text-slate-500', key: 'escalation.noAuthority' },
  CANCELLED: { icon: MailX, className: 'text-slate-400', key: 'escalation.cancelled' },
};

/**
 * Public-safe tier-2 escalation card. Shows the authority NAME and dispatch
 * status only — never the email address, subject or body.
 */
export default function EscalationCard({ escalation, language }) {
  const { t } = useTranslation();
  if (!escalation) return null;

  const meta = STATUS_META[escalation.status] ?? STATUS_META.PENDING;
  const Icon = meta.icon;
  const statusText =
    escalation.status === 'SENT'
      ? t(meta.key, { name: escalation.authorityName ?? '—' })
      : t(meta.key);

  return (
    <Card className="overflow-hidden border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-blue-50/60">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-sm">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{t('escalation.title')}</p>
            {escalation.authorityName && (
              <p className="truncate text-xs text-slate-500">{escalation.authorityName}</p>
            )}
          </div>
        </div>

        <p className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${meta.className}`}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {statusText}
        </p>
        {escalation.sentAt && (
          <p className="mt-1 text-xs text-slate-400">
            {t('escalation.dateLabel')}: {formatTxnDate(escalation.sentAt, language)}
          </p>
        )}

        <p className="mt-3 text-xs leading-relaxed text-slate-500">{t('escalation.neutral')}</p>
        <p className="mt-2 border-t border-violet-100 pt-2 text-[11px] text-slate-400">
          {t('escalation.notOfficial')}
        </p>
      </CardContent>
    </Card>
  );
}

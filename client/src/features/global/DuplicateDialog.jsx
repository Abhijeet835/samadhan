import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ExternalLink, HeartHandshake, Loader2, MapPin } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatPaise } from '@/features/wallet/money';
import { CategoryBadge, StatusBadge } from './StatusBadge';
import { useIssueMeta } from './useIssueMeta';

/**
 * Shown when POST /api/issues returns 409 DUPLICATE_FOUND. Nothing has been
 * charged yet: the user can support the existing issue, force-create their
 * own (same idempotencyKey), view it, or cancel.
 */
export default function DuplicateDialog({ duplicate, onClose, onForce, forcing }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const meta = useIssueMeta();
  const [supporting, setSupporting] = useState(false);
  const [supportError, setSupportError] = useState(null);
  const keyRef = useRef(`support:${crypto.randomUUID()}`);

  if (!duplicate) return null;

  const fee = meta?.supportFeePaise;

  async function supportExisting() {
    if (supporting) return;
    setSupporting(true);
    setSupportError(null);
    try {
      await api.post(`/issues/${duplicate._id}/support`, { idempotencyKey: keyRef.current });
      toast.success(t('support.success'));
      navigate(`/issues/${duplicate._id}`);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'INSUFFICIENT_BALANCE') {
        setSupportError(t('report.insufficient'));
      } else if (code === 'ALREADY_SUPPORTED') {
        navigate(`/issues/${duplicate._id}`);
      } else {
        setSupportError(t('support.failed'));
      }
    } finally {
      setSupporting(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('duplicate.title')}>
      <p className="mb-4 flex items-start gap-1.5 text-sm text-slate-600">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
        {t('duplicate.subtitle', { distance: duplicate.distanceM })}
      </p>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={duplicate.status} />
          <CategoryBadge category={duplicate.category} />
        </div>
        <p className="font-semibold text-slate-900">{duplicate.title}</p>
        <p className="mt-2 text-sm text-slate-600 tabular-nums">
          {formatPaise(duplicate.fundPaise, i18n.language)}
          <span className="ml-1 text-xs text-slate-400">{t('issues.fundLabel')}</span>
          {' · '}
          {t('issues.supporters', { count: duplicate.supporterCount })}
        </p>
      </div>

      {supportError && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">{supportError}</p>
      )}

      <div className="mt-4 space-y-2">
        {duplicate.canSupport && (
          <Button type="button" className="w-full gap-2" disabled={supporting || forcing} onClick={supportExisting}>
            {supporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
            {fee !== undefined ? t('duplicate.supportCta', { amount: formatPaise(fee, i18n.language) }) : t('common.loading')}
          </Button>
        )}
        <Button type="button" variant="outline" className="w-full gap-2" disabled={forcing || supporting} onClick={onForce}>
          {forcing && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('duplicate.forceCta')}
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 gap-1.5"
            onClick={() => navigate(`/issues/${duplicate._id}`)}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t('duplicate.viewCta')}
          </Button>
          <Button type="button" variant="ghost" className="flex-1" disabled={forcing} onClick={onClose}>
            {t('duplicate.cancel')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

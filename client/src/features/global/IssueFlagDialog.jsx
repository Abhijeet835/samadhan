import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Flag } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

const REASONS = ['SPAM', 'DUPLICATE', 'INAPPROPRIATE', 'WRONG_LOCATION', 'OTHER'];

export default function IssueFlagDialog({ issueId }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('SPAM');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.post(`/issues/${issueId}/flag`, { reason, comment });
      toast.success(t('issues.flag.submitted'));
      setOpen(false);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      toast.error(code === 'ALREADY_FLAGGED' ? t('issues.flag.already') : code === 'CANNOT_FLAG_OWN_ISSUE' ? t('issues.flag.own') : t('issues.flag.failed'));
    } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600">
        <Flag className="h-3 w-3" aria-hidden="true" />
        {t('issues.flag.report')}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('issues.flag.title')}>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="radio" name="flag-reason" checked={reason === r} onChange={() => setReason(r)} />
              {t(`issues.flag.reasons.${r}`)}
            </label>
          ))}
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={300} placeholder={t('issues.flag.commentPlaceholder')} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <Button className="w-full bg-red-600 hover:bg-red-700" disabled={busy} onClick={submit}>{t('issues.flag.submit')}</Button>
        </div>
      </Dialog>
    </>
  );
}

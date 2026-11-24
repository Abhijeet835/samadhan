import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mirrors the backend lifecycle table (server/src/modules/issues/issue.service.js).
const ALLOWED = {
  ACTIVE: ['ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'ACTIVE'],
  CLOSED: [],
  REJECTED: [],
};

export function nextStatusesFor(issue, viewer) {
  const allowed = ALLOWED[issue.status] ?? [];
  return allowed.filter((status) => {
    if (status === 'ACTIVE') return viewer.isReporter && viewer.canReopen;
    if (status === 'RESOLVED') return viewer.isAdmin || viewer.isReporter;
    return viewer.isAdmin;
  });
}

export default function TransitionPanel({ issue, viewer, onTransition }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const options = nextStatusesFor(issue, viewer);
  if (options.length === 0) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!status) {
      setError(t('issues.transitions.selectRequired'));
      return;
    }
    setPending(true);
    setError(null);
    const result = await onTransition(status, note);
    setPending(false);
    if (!result.success) {
      setError(result.error);
    } else {
      setStatus('');
      setNote('');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{viewer.isAdmin ? t('issues.transitions.adminTitle') : t('issues.transitions.reporterTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="transition-status" className="mb-1 block text-sm font-medium text-slate-700">
              {t('issues.transitions.selectStatus')}
            </label>
            <select
              id="transition-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('issues.transitions.selectPlaceholder')}</option>
              {options.map((s) => (
                <option key={s} value={s}>{t(`issues.statuses.${s}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="transition-note" className="mb-1 block text-sm font-medium text-slate-700">
              {t('issues.transitions.noteLabel')}
            </label>
            <textarea
              id="transition-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder={t('issues.transitions.notePlaceholder')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">{error}</p>
          )}
          <Button type="submit" disabled={pending || !status}>
            {pending ? t('common.loading') : t('issues.transitions.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
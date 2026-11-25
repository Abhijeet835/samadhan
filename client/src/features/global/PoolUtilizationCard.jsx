import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Building2, Plus, Receipt } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPaise } from '@/features/wallet/money';
import { getErrorMessage } from '@/lib/errors';

export default function PoolUtilizationCard({ issue, viewer, onReload }) {
  const { t, i18n } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState('');
  const [rupees, setRupees] = useState('');
  const [note, setNote] = useState('');

  if (issue.issueType !== 'POOL_FUNDS') return null;

  const canManage = viewer.isAdmin || viewer.isReporter;
  const utilizations = issue.fundUtilization ?? [];
  const totalUtilized = utilizations.reduce((s, u) => s + (u.amountPaise || 0), 0);
  const poolRemaining = Math.max(0, (issue.fundPaise || 0) - totalUtilized);

  async function submitItem(e) {
    e.preventDefault();
    const paise = Math.round(Number(rupees) * 100);
    if (!item.trim() || !Number.isFinite(paise) || paise < 100) return;
    setSaving(true);
    try {
      await api.post(`/issues/${issue._id}/utilization`, {
        item: item.trim(),
        amountPaise: paise,
        note: note.trim(),
      });
      toast.success(t('pool.utilizationAdded'));
      setItem('');
      setRupees('');
      setNote('');
      setAdding(false);
      onReload?.();
    } catch (err) {
      toast.error(getErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-teal-100">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-teal-700" aria-hidden="true" />
          {t('pool.utilizationTitle')}
        </CardTitle>
        {canManage && !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('pool.addExpense')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {issue.responsibleParty?.name && (
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-800">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('pool.responsibleLabel')}
            </p>
            <p className="mt-1 font-bold text-slate-900">{issue.responsibleParty.name}</p>
            {issue.responsibleParty.contactRole && (
              <p className="text-xs text-slate-600">{issue.responsibleParty.contactRole}</p>
            )}
            {issue.responsibleParty.note && (
              <p className="mt-1 text-xs text-slate-500">{issue.responsibleParty.note}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: t('pool.pooled'), value: issue.fundPaise || 0 },
            { label: t('pool.spent'), value: totalUtilized },
            { label: t('pool.remaining'), value: poolRemaining },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-0.5 text-sm font-extrabold tabular-nums text-slate-900">{formatPaise(value, i18n.language)}</p>
            </div>
          ))}
        </div>

        {adding && (
          <form onSubmit={submitItem} className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input
              required
              minLength={2}
              className="field-input"
              placeholder={t('pool.itemPlaceholder')}
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                required
                type="number"
                min="1"
                step="1"
                className="field-input"
                placeholder={t('pool.amountPlaceholder')}
                value={rupees}
                onChange={(e) => setRupees(e.target.value)}
              />
              <input
                className="field-input"
                placeholder={t('pool.notePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
              <Button type="submit" size="sm" disabled={saving} className="bg-teal-700 hover:bg-teal-800">{t('common.save')}</Button>
            </div>
          </form>
        )}

        {utilizations.length === 0 ? (
          <p className="text-sm text-slate-500">{t('pool.noUtilizationYet')}</p>
        ) : (
          <div className="space-y-2">
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {utilizations.map((u, idx) => (
                <li key={`${u.item}-${idx}`} className="flex items-start justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{u.item}</p>
                    {u.note && <p className="text-xs text-slate-500">{u.note}</p>}
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-teal-800">
                    {formatPaise(u.amountPaise, i18n.language)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{t('pool.totalUtilized')}</span>
              <span className="tabular-nums">{formatPaise(totalUtilized, i18n.language)} / {formatPaise(issue.fundPaise, i18n.language)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

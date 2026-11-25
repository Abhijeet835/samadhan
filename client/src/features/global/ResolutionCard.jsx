import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Award, Building2, CheckCircle2, ExternalLink, Landmark, ShieldCheck, Users } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTxnDate } from '@/features/wallet/money';
import { SOLVER_TYPES } from './constants';
import { getErrorMessage } from '@/lib/errors';

const SOLVER_ICONS = {
  GOVERNMENT: Landmark,
  NGO: ShieldCheck,
  PRIVATE_ORG: Building2,
  COMMUNITY: Users,
};

export default function ResolutionCard({ issue, viewer, onReload }) {
  const { t, i18n } = useTranslation();
  const res = issue.resolution;
  const hasResolution = !!(res?.organizationName && (issue.status === 'RESOLVED' || issue.status === 'CLOSED'));
  const canEdit = (viewer.isAdmin || viewer.isReporter) && !['REJECTED', 'CLOSED'].includes(issue.status);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    solverType: res?.solverType || 'GOVERNMENT',
    organizationName: res?.organizationName || '',
    departmentOrLead: res?.departmentOrLead || '',
    resolutionDetails: res?.resolutionDetails || '',
    impactSummary: res?.impactSummary || '',
    promoteEnabled: res?.promotion?.enabled ?? false,
    tagline: res?.promotion?.tagline || '',
    badgeText: res?.promotion?.badgeText || '',
    websiteUrl: res?.promotion?.websiteUrl || '',
  });

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.post(`/issues/${issue._id}/resolve`, {
        solverType: form.solverType,
        organizationName: form.organizationName.trim(),
        departmentOrLead: form.departmentOrLead.trim(),
        resolutionDetails: form.resolutionDetails.trim(),
        impactSummary: form.impactSummary.trim(),
        promotion: {
          enabled: form.solverType === 'NGO' || form.solverType === 'PRIVATE_ORG' ? form.promoteEnabled : false,
          tagline: form.tagline.trim(),
          badgeText: form.badgeText.trim(),
          websiteUrl: form.websiteUrl.trim(),
        },
      });
      toast.success(t('resolution.saved'));
      setEditing(false);
      onReload?.();
    } catch (err) {
      toast.error(getErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  const SolverIcon = SOLVER_ICONS[res?.solverType] ?? CheckCircle2;

  return (
    <Card className={hasResolution ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white' : ''}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className={hasResolution ? 'h-5 w-5 text-emerald-600' : 'h-5 w-5 text-slate-400'} aria-hidden="true" />
          {t('resolution.title')}
        </CardTitle>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {hasResolution ? t('resolution.edit') : t('resolution.recordCta')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{t('resolution.solverTypeLabel')}</label>
                <select
                  className="field-input"
                  value={form.solverType}
                  onChange={(e) => setForm({ ...form, solverType: e.target.value, promoteEnabled: ['NGO', 'PRIVATE_ORG'].includes(e.target.value) })}
                >
                  {SOLVER_TYPES.map((st) => (
                    <option key={st} value={st}>{t(`resolution.solverTypes.${st}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{t('resolution.orgLabel')}</label>
                <input
                  required
                  minLength={2}
                  className="field-input"
                  value={form.organizationName}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                  placeholder={t('resolution.orgPlaceholder')}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{t('resolution.departmentLabel')}</label>
              <input
                className="field-input"
                value={form.departmentOrLead}
                onChange={(e) => setForm({ ...form, departmentOrLead: e.target.value })}
                placeholder={t('resolution.departmentPlaceholder')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{t('resolution.detailsLabel')}</label>
              <textarea
                required
                minLength={10}
                rows={3}
                className="field-input"
                value={form.resolutionDetails}
                onChange={(e) => setForm({ ...form, resolutionDetails: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{t('resolution.impactLabel')}</label>
              <input
                className="field-input"
                value={form.impactSummary}
                onChange={(e) => setForm({ ...form, impactSummary: e.target.value })}
              />
            </div>
            {(form.solverType === 'NGO' || form.solverType === 'PRIVATE_ORG') && (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  <input
                    type="checkbox"
                    checked={form.promoteEnabled}
                    onChange={(e) => setForm({ ...form, promoteEnabled: e.target.checked })}
                  />
                  {t('resolution.enablePromo')}
                </label>
                {form.promoteEnabled && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className="field-input" placeholder={t('resolution.taglinePlaceholder')} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
                    <input className="field-input" placeholder={t('resolution.badgePlaceholder')} value={form.badgeText} onChange={(e) => setForm({ ...form, badgeText: e.target.value })} />
                    <input className="field-input sm:col-span-2" placeholder="https://example.org" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} />
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
            </div>
          </form>
        ) : hasResolution ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <SolverIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {t(`resolution.solverTypes.${res.solverType}`)}
              </span>
              {res.resolvedAt && (
                <span className="text-xs text-slate-500">{formatTxnDate(res.resolvedAt, i18n.language)}</span>
              )}
            </div>

            <div>
              <p className="text-base font-bold text-slate-900">{res.organizationName}</p>
              {res.departmentOrLead && <p className="text-xs font-medium text-slate-500">{res.departmentOrLead}</p>}
            </div>

            <p className="text-sm leading-relaxed text-slate-700">{res.resolutionDetails}</p>

            {res.impactSummary && (
              <div className="rounded-xl border border-emerald-200 bg-white p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{t('resolution.impactHeading')}</p>
                <p className="mt-1 text-sm text-slate-700">{res.impactSummary}</p>
              </div>
            )}

            {res.promotion?.enabled && (
              <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/70 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800">
                    <Award className="h-4 w-4" aria-hidden="true" />
                    {res.promotion.badgeText || t('resolution.verifiedPartner')}
                  </span>
                  {res.promotion.websiteUrl && (
                    <a
                      href={res.promotion.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:underline"
                    >
                      {t('resolution.visitPartner')}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
                {res.promotion.tagline && (
                  <p className="mt-1 text-xs text-amber-900/90">{res.promotion.tagline}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t('resolution.unresolvedHint')}</p>
        )}
      </CardContent>
    </Card>
  );
}

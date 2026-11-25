import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const PAISE_KEYS = [
  'reportFeePaise',
  'supportFeePaise',
  'tier1Paise',
  'tier2Paise',
  'smallPoolGoalPaise',
  'mediumPoolGoalPaise',
  'largePoolGoalPaise',
  'signupCreditPaise',
  'platformCreditMaxPaise',
];

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState([]);
  const [demoThresholds, setDemoThresholds] = useState(null);
  const [socialMode, setSocialMode] = useState('');
  const [categories, setCategories] = useState(null);
  const [draft, setDraft] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [s, c] = await Promise.all([api.get('/admin/settings'), api.get('/admin/categories')]);
    setSettings(s.data.settings); setDemoThresholds(s.data.demoThresholds); setSocialMode(s.data.socialPublishMode);
    setCategories(c.data);
    setDraft(Object.fromEntries(s.data.settings.map((x) => [x.key, x.value])));
  }
  useEffect(() => { load().catch(() => toast.error(t('admin.loadFailed'))); }, []);

  const demoOn = draft.demoMode === true;

  function requestSave() {
    const changed = {};
    for (const s of settings) {
      let v = draft[s.key];
      if (s.type === 'int') v = Number(v);
      if (v !== s.value) changed[s.key] = v;
    }
    if (Object.keys(changed).length === 0) return;
    setConfirm(changed);
  }

  async function doSave() {
    setBusy(true);
    try { await api.patch('/admin/settings', confirm); toast.success(t('admin.done')); setConfirm(null); load(); }
    catch (err) { toast.error(err.response?.data?.error?.message ?? t('admin.actionFailed')); }
    finally { setBusy(false); }
  }

  async function toggleCategory(kind, key, enabled) {
    const listKey = kind === 'global' ? 'disabledIssueCategories' : 'disabledHelperCategories';
    const current = categories[kind].filter((c) => !c.enabled).map((c) => c.key);
    const next = enabled ? current.filter((k) => k !== key) : [...current, key];
    try { const res = await api.patch('/admin/categories', { [listKey]: next }); setCategories(res.data); toast.success(t('admin.done')); }
    catch (err) { toast.error(err.response?.data?.error?.message ?? t('admin.actionFailed')); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t('admin.tabs.settings')}</h1>
      {demoOn && <div className="mt-3 rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">{t('admin.demoBanner', { t1: '₹20', t2: '₹50' })}</div>}

      <Card className="mt-4"><CardContent className="pt-5">
        <p className="font-semibold text-slate-900">{t('admin.feesLimits')}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {settings.map((s) => (
            <div key={s.key}>
              <label className="text-xs font-semibold text-slate-500">{t(`admin.settingKeys.${s.key}`, s.key)}</label>
              {s.type === 'bool' ? (
                <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft[s.key]} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.checked })} />{t('admin.enabled')}</label>
              ) : (
                <div className="mt-1 flex items-center gap-1">
                  {PAISE_KEYS.includes(s.key) && <span className="text-sm text-slate-400">₹</span>}
                  <input type="number" value={PAISE_KEYS.includes(s.key) ? (draft[s.key] ?? 0) / 100 : draft[s.key]}
                    onChange={(e) => setDraft({ ...draft, [s.key]: PAISE_KEYS.includes(s.key) ? Math.round(Number(e.target.value) * 100) : Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              )}
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={requestSave}>{t('admin.saveSettings')}</Button>
        {demoThresholds && <p className="mt-2 text-xs text-slate-400">{t('admin.demoThresholdsNote', { t1: demoThresholds.tier1Paise / 100, t2: demoThresholds.tier2Paise / 100 })}</p>}
        <p className="mt-2 text-xs text-slate-500">{t('admin.socialMode')}: <span className="font-semibold">{socialMode}</span> · <Link to="/admin/social" className="text-blue-700 underline">{t('admin.manageSocial')}</Link> · <Link to="/admin/dispatch" className="text-blue-700 underline">{t('admin.manageAuthorities')}</Link></p>
      </CardContent></Card>

      {categories && (
        <Card className="mt-4"><CardContent className="pt-5">
          <p className="font-semibold text-slate-900">{t('admin.categories')}</p>
          {['global', 'local'].map((kind) => (
            <div key={kind} className="mt-3">
              <p className="text-xs font-bold uppercase text-slate-400">{t(`admin.${kind}Categories`)}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {categories[kind].map((c) => (
                  <button key={c.key} type="button" onClick={() => toggleCategory(kind, c.key, !c.enabled)}
                    className={cn('rounded-full px-3 py-1 text-xs font-semibold', c.enabled ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' : 'bg-slate-200 text-slate-400 line-through')}>
                    {t(kind === 'local' ? `local.categories.${c.key}` : `issues.categories.${c.key}`, c.key)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent></Card>
      )}

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={t('admin.confirmSettings')}>
        <ul className="space-y-1 text-sm">
          {confirm && Object.entries(confirm).map(([k, v]) => {
            const old = settings.find((s) => s.key === k)?.value;
            const fmt = (x) => PAISE_KEYS.includes(k) ? `₹${x / 100}` : String(x);
            return <li key={k} className="flex justify-between rounded bg-slate-50 px-2 py-1"><span>{k}</span><span><span className="text-slate-400 line-through">{fmt(old)}</span> → <span className="font-bold">{fmt(v)}</span></span></li>;
          })}
        </ul>
        <Button className="mt-3 w-full" disabled={busy} onClick={doSave}>{t('admin.confirm')}</Button>
      </Dialog>
    </div>
  );
}

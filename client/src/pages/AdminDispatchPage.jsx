import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Building2, Eye, Inbox, Loader2, Plus, RefreshCw, Send } from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatTxnDate } from '@/features/wallet/money';

const STATUS_STYLES = {
  SENT: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  SIMULATED: 'bg-blue-50 text-blue-700 ring-blue-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  FAILED: 'bg-red-50 text-red-700 ring-red-200',
  SKIPPED: 'bg-slate-100 text-slate-600 ring-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-400 ring-slate-200',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500';
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';

function StatusChip({ status }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1', STATUS_STYLES[status] ?? STATUS_STYLES.SKIPPED)}>
      {status}
    </span>
  );
}

function DispatchLogTab() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const load = useCallback(async (page = 1, append = false) => {
    if (!append) setLoading(true);
    setError(false);
    try {
      const res = await api.get('/admin/dispatch', {
        params: { page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}) },
      });
      setRows((prev) => (append ? [...prev, ...res.data.rows] : res.data.rows));
      setPagination(res.data.pagination);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load(1);
  }, [load]);

  async function retry(row) {
    setRetryingId(row._id);
    try {
      const res = await api.post(`/admin/dispatch/${row._id}/retry`);
      toast.success(t('adminDispatch.retrySuccess'));
      setRows((prev) => prev.map((r) => (r._id === row._id ? { ...r, ...res.data.row } : r)));
    } catch {
      toast.error(t('adminDispatch.retryFailed'));
    } finally {
      setRetryingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-label={t('common.loading')}>
        {[0, 1, 2].map((n) => <div key={n} className="h-24 animate-pulse rounded-xl bg-slate-200" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
        <p className="text-slate-600">{t('adminDispatch.loadFailed')}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>{t('common.retry')}</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn(inputClass, 'max-w-48')}
          aria-label={t('adminDispatch.statusLabel')}
        >
          <option value="">{t('adminDispatch.filterAll')}</option>
          {Object.keys(STATUS_STYLES).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => load(1)}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {t('common.retry')}
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
          <p className="font-medium text-slate-700">{t('adminDispatch.empty')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row._id}>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={row.status} />
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200">
                      {t('adminDispatch.tier')} {row.tier}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {row.channel === 'EMAIL' ? t('adminDispatch.channelEmail') : t('adminDispatch.channelWebhook')}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">
                      {t('adminDispatch.attempts', { count: row.attempts })}
                    </span>
                  </div>
                  <Link
                    to={`/issues/${row.issueId?._id ?? row.issueId}`}
                    className="mt-2 block truncate font-semibold text-slate-900 hover:text-blue-700"
                  >
                    {row.issueId?.title ?? '—'}
                  </Link>
                  {row.to && <p className="mt-0.5 truncate text-xs text-slate-500">{t('adminDispatch.to')}: {row.to}</p>}
                  {row.lastError && <p className="mt-1 truncate text-xs text-red-600">{row.lastError}</p>}
                  <p className="mt-1 text-xs text-slate-400">{formatTxnDate(row.updatedAt, i18n.language)}</p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPreview(row)}>
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('adminDispatch.preview')}
                    </Button>
                    {row.status === 'FAILED' && (
                      <Button size="sm" className="gap-1.5" disabled={retryingId === row._id} onClick={() => retry(row)}>
                        {retryingId === row._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                        {t('adminDispatch.retry')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {pagination && pagination.page < pagination.totalPages && (
        <Button variant="outline" className="mt-4 w-full" onClick={() => load(pagination.page + 1, true)}>
          {t('common.loadMore')}
        </Button>
      )}

      <Dialog open={!!preview} onClose={() => setPreview(null)} title={t('adminDispatch.previewTitle')} maxWidth="max-w-2xl">
        {preview && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={preview.status} />
              {preview.reason && <span className="text-xs text-slate-500">{preview.reason}</span>}
            </div>
            {preview.to && <p><span className="font-semibold">{t('adminDispatch.to')}:</span> {preview.to}</p>}
            {preview.subject && <p><span className="font-semibold">{t('adminDispatch.subject')}:</span> {preview.subject}</p>}
            {preview.bodyText ? (
              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                {preview.bodyText}
              </pre>
            ) : (
              <p className="text-slate-400">{t('adminDispatch.noPreview')}</p>
            )}
            {preview.lastError && <p className="text-xs text-red-600">{preview.lastError}</p>}
          </div>
        )}
      </Dialog>
    </div>
  );
}

const EMPTY_AUTHORITY = {
  nameEn: '', nameHi: '', department: '', categories: [], cityKeys: '',
  email: '', handles: { x: '', facebook: '', instagram: '' }, isActive: true, isFallback: false,
};

function AuthoritiesTab() {
  const { t } = useTranslation();
  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_AUTHORITY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get('/admin/authorities');
      setAuthorities(res.data.authorities);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(authority) {
    setEditing(authority?._id ?? 'new');
    setForm(
      authority
        ? { ...authority, cityKeys: authority.cityKeys.join(', '), handles: { x: '', facebook: '', instagram: '', ...authority.handles } }
        : EMPTY_AUTHORITY,
    );
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        cityKeys: form.cityKeys.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (editing === 'new') {
        await api.post('/admin/authorities', payload);
        toast.success(t('authority.created'));
      } else {
        await api.patch(`/admin/authorities/${editing}`, payload);
        toast.success(t('authority.saved'));
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? t('authority.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-label={t('common.loading')}>
        {[0, 1].map((n) => <div key={n} className="h-28 animate-pulse rounded-xl bg-slate-200" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
        <p className="text-slate-600">{t('authority.loadFailed')}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={load}>{t('common.retry')}</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => openEdit(null)}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {t('authority.add')}
        </Button>
      </div>

      {authorities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Building2 className="h-10 w-10 text-slate-300" aria-hidden="true" />
          <p className="font-medium text-slate-700">{t('authority.empty')}</p>
          <p className="text-xs text-slate-400">npm run seed:authorities</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {authorities.map((authority) => (
            <li key={authority._id}>
              <Card className={cn(!authority.isActive && 'opacity-60')}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{authority.nameEn}</p>
                      <p className="truncate text-xs text-slate-500">{authority.nameHi}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEdit(authority)}>{t('authority.edit')}</Button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{authority.department} · {authority.cityKeys.join(', ')}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{authority.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {authority.categories.map((c) => (
                      <span key={c} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{c}</span>
                    ))}
                    {authority.isFallback && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{t('authority.fallbackBadge')}</span>
                    )}
                    {!authority.isActive && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{t('authority.inactive')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!editing}
        onClose={() => !saving && setEditing(null)}
        title={editing === 'new' ? t('authority.add') : t('authority.edit')}
        maxWidth="max-w-lg"
      >
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('authority.nameEn')}</label>
            <input className={inputClass} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>{t('authority.nameHi')}</label>
            <input className={inputClass} value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>{t('authority.department')}</label>
            <input className={inputClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>{t('authority.email')}</label>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>{t('authority.cityKeys')}</label>
            <input className={inputClass} value={form.cityKeys} onChange={(e) => setForm({ ...form, cityKeys: e.target.value })} placeholder="bengaluru, bangalore" />
          </div>
          <div>
            <label className={labelClass}>{t('authority.categories')}</label>
            <input
              className={inputClass}
              value={form.categories.join(', ')}
              onChange={(e) => setForm({ ...form, categories: e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) })}
              placeholder="ROAD, WATER, *"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['x', 'facebook', 'instagram'].map((handle) => (
              <div key={handle}>
                <label className={labelClass}>{t(`authority.${handle}`)}</label>
                <input
                  className={inputClass}
                  value={form.handles?.[handle] ?? ''}
                  onChange={(e) => setForm({ ...form, handles: { ...form.handles, [handle]: e.target.value } })}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              {t('authority.active')}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isFallback} onChange={(e) => setForm({ ...form, isFallback: e.target.checked })} />
              {t('authority.fallback')}
            </label>
          </div>
          <Button className="w-full gap-2" disabled={saving} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('authority.save')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export default function AdminDispatchPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('log');

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-3xl font-bold text-slate-900">{t('adminDispatch.title')}</h1>
        <p className="mt-2 text-slate-600">{t('adminDispatch.subtitle')}</p>

        <div className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
          {[
            { key: 'log', label: t('adminDispatch.tab.log'), icon: Send },
            { key: 'authorities', label: t('adminDispatch.tab.authorities'), icon: Building2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">{tab === 'log' ? <DispatchLogTab /> : <AuthoritiesTab />}</div>
      </div>
    </div>
  );
}

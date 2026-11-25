import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Ban,
  ExternalLink,
  Eye,
  Inbox,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { PLATFORM_STYLES } from '@/features/global/OfficialCampaigns';
import { formatTxnDate } from '@/features/wallet/money';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  GENERATED: 'bg-amber-50 text-amber-700 ring-amber-200',
  POSTING: 'bg-sky-50 text-sky-700 ring-sky-200',
  POSTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  SIMULATED: 'bg-blue-50 text-blue-700 ring-blue-200',
  FAILED: 'bg-red-50 text-red-700 ring-red-200',
  TAKEN_DOWN: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const PLATFORMS = ['X', 'INSTAGRAM', 'FACEBOOK', 'REDDIT', 'WHATSAPP', 'TELEGRAM'];

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500';

export default function AdminSocialPage() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [publishMode, setPublishMode] = useState('AUTO');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [savingMode, setSavingMode] = useState(false);
  const [preview, setPreview] = useState(null);
  const [takedownTarget, setTakedownTarget] = useState(null);
  const [takedownReason, setTakedownReason] = useState('');

  const load = useCallback(
    async (page = 1, append = false) => {
      if (!append) setLoading(true);
      setError(false);
      try {
        const res = await api.get('/admin/social', {
          params: {
            page,
            limit: 20,
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(platformFilter ? { platform: platformFilter } : {}),
            ...(tierFilter ? { tier: tierFilter } : {}),
          },
        });
        setPosts((prev) => (append ? [...prev, ...res.data.posts] : res.data.posts));
        setPagination(res.data.pagination);
        if (res.data.socialPublishMode) {
          setPublishMode(res.data.socialPublishMode);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, platformFilter, tierFilter],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  async function togglePublishMode(nextMode) {
    if (savingMode || nextMode === publishMode) return;
    setSavingMode(true);
    try {
      const res = await api.patch('/admin/social/settings', { socialPublishMode: nextMode });
      setPublishMode(res.data.socialPublishMode);
      toast.success(t('adminSocial.modeSaved', { mode: res.data.socialPublishMode }));
    } catch {
      toast.error(t('adminSocial.actionFailed'));
    } finally {
      setSavingMode(false);
    }
  }

  async function runPostAction(postId, action, successKey) {
    if (busyId) return;
    setBusyId(postId);
    try {
      const res = await api.post(`/admin/social/${postId}/${action}`);
      setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, ...res.data.post } : p)));
      toast.success(t(successKey));
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? t('adminSocial.actionFailed'));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmTakedown() {
    if (!takedownTarget || !takedownReason.trim() || busyId) return;
    setBusyId(takedownTarget._id);
    try {
      const res = await api.post(`/admin/social/${takedownTarget._id}/takedown`, {
        reason: takedownReason.trim(),
      });
      setPosts((prev) =>
        prev.map((p) => (p._id === takedownTarget._id ? { ...p, ...res.data.post } : p)),
      );
      toast.success(t('adminSocial.takedownSuccess'));
      setTakedownTarget(null);
      setTakedownReason('');
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? t('adminSocial.actionFailed'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('adminSocial.title')}</h1>
            <p className="mt-2 text-slate-600">{t('adminSocial.subtitle')}</p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <span className="px-2 text-xs font-semibold text-slate-500">
              {t('adminSocial.publishMode')}
            </span>
            {['AUTO', 'REVIEW'].map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={savingMode}
                onClick={() => togglePublishMode(mode)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                  publishMode === mode
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {t(`adminSocial.modes.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
            aria-label={t('adminSocial.filterStatus')}
          >
            <option value="">{t('adminSocial.filterStatus')}</option>
            {Object.keys(STATUS_STYLES).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className={selectClass}
            aria-label={t('adminSocial.filterPlatform')}
          >
            <option value="">{t('adminSocial.filterPlatform')}</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className={selectClass}
            aria-label={t('adminSocial.filterTier')}
          >
            <option value="">{t('adminSocial.filterTier')}</option>
            <option value="1">{t('adminDispatch.tier')} 1</option>
            <option value="2">{t('adminDispatch.tier')} 2</option>
          </select>

          <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={() => load(1)}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t('common.retry')}
          </Button>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3" aria-label={t('common.loading')}>
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-28 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <p className="text-slate-600">{t('adminSocial.loadFailed')}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => load(1)}>
                {t('common.retry')}
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <Inbox className="h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="font-medium text-slate-700">{t('adminSocial.empty')}</p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {posts.map((post) => {
                  const isBusy = busyId === post._id;
                  const canPublish =
                    ['GENERATED', 'SIMULATED'].includes(post.status) &&
                    post.platform !== 'WHATSAPP';
                  const canRetry = post.status === 'FAILED';
                  const canRegenerate = !['POSTED', 'TAKEN_DOWN'].includes(post.status);
                  const canTakedown = post.status !== 'TAKEN_DOWN';

                  return (
                    <li key={post._id}>
                      <Card className={cn(post.status === 'TAKEN_DOWN' && 'opacity-65')}>
                        <CardContent className="pt-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                PLATFORM_STYLES[post.platform],
                              )}
                            >
                              {post.platform}
                            </span>
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1',
                                STATUS_STYLES[post.status] ?? STATUS_STYLES.GENERATED,
                              )}
                            >
                              {post.status}
                            </span>
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200">
                              {t('adminDispatch.tier')} {post.tier}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">
                              {post.generationSource}
                            </span>
                            <span className="ml-auto text-xs text-slate-400">
                              {t('adminSocial.clicks', { count: post.shareClicks ?? 0 })}
                            </span>
                          </div>

                          <Link
                            to={`/issues/${post.issueId?._id ?? post.issueId}`}
                            className="mt-2 block truncate font-semibold text-slate-900 hover:text-blue-700"
                          >
                            {post.issueId?.title ?? '—'}
                          </Link>

                          <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                            {i18n.language?.startsWith('hi') ? post.captionHi : post.captionEn}
                          </p>

                          {post.lastError && (
                            <p className="mt-1 truncate text-xs text-red-600">{post.lastError}</p>
                          )}
                          {post.takedownReason && (
                            <p className="mt-1 text-xs text-slate-500">
                              {t('adminSocial.takedownReasonLabel')}: {post.takedownReason}
                            </p>
                          )}

                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatTxnDate(post.updatedAt, i18n.language)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setPreview(post)}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              {t('adminDispatch.preview')}
                            </Button>

                            {canPublish && (
                              <Button
                                size="sm"
                                className="gap-1.5"
                                disabled={isBusy}
                                onClick={() =>
                                  runPostAction(post._id, 'publish', 'adminSocial.publishSuccess')
                                }
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                                {t('adminSocial.publish')}
                              </Button>
                            )}

                            {canRetry && (
                              <Button
                                size="sm"
                                className="gap-1.5"
                                disabled={isBusy}
                                onClick={() =>
                                  runPostAction(post._id, 'retry', 'adminSocial.retrySuccess')
                                }
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                                {t('adminDispatch.retry')}
                              </Button>
                            )}

                            {canRegenerate && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                disabled={isBusy}
                                onClick={() =>
                                  runPostAction(
                                    post._id,
                                    'regenerate',
                                    'adminSocial.regenerateSuccess',
                                  )
                                }
                              >
                                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('adminSocial.regenerate')}
                              </Button>
                            )}

                            {canTakedown && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                                disabled={isBusy}
                                onClick={() => {
                                  setTakedownTarget(post);
                                  setTakedownReason('');
                                }}
                              >
                                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('adminSocial.takedown')}
                              </Button>
                            )}

                            {post.externalUrl && (
                              <a
                                href={post.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                              >
                                {t('social.viewPost')}
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>

              {pagination && pagination.page < pagination.totalPages && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => load(pagination.page + 1, true)}
                >
                  {t('common.loadMore')}
                </Button>
              )}
            </>
          )}
        </div>

        <Dialog
          open={!!preview}
          onClose={() => setPreview(null)}
          title={t('adminSocial.previewTitle')}
          maxWidth="max-w-2xl"
        >
          {preview && (
            <div className="space-y-4 text-sm">
              {preview.titleEn && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    {t('share.langEn')}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">{preview.titleEn}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {t('share.langEn')}
                </p>
                <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  {preview.captionEn}
                </pre>
              </div>
              {preview.titleHi && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    {t('share.langHi')}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">{preview.titleHi}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {t('share.langHi')}
                </p>
                <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  {preview.captionHi}
                </pre>
              </div>
            </div>
          )}
        </Dialog>

        <Dialog
          open={!!takedownTarget}
          onClose={() => !busyId && setTakedownTarget(null)}
          title={t('adminSocial.takedownTitle')}
          maxWidth="max-w-md"
        >
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('adminSocial.takedownReasonLabel')}
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={takedownReason}
              onChange={(e) => setTakedownReason(e.target.value)}
              placeholder={t('adminSocial.takedownPlaceholder')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
            <Button
              className="w-full gap-2 bg-red-600 hover:bg-red-700"
              disabled={!takedownReason.trim() || !!busyId}
              onClick={confirmTakedown}
            >
              {busyId && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('adminSocial.confirmTakedown')}
            </Button>
          </div>
        </Dialog>
      </div>
    </div>
  );
}

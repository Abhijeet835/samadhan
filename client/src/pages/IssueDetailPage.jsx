import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBadge, StatusBadge } from '@/features/global/StatusBadge';
import Timeline from '@/features/global/Timeline';
import TransitionPanel from '@/features/global/TransitionPanel';
import FundMeter from '@/features/global/FundMeter';
import SupportPanel from '@/features/global/SupportPanel';
import SupportersList from '@/features/global/SupportersList';
import { useIssueDetail } from '@/features/global/useIssueDetail';
import { useIssueMeta } from '@/features/global/useIssueMeta';
import { formatTxnDate } from '@/features/wallet/money';

export default function IssueDetailPage() {
  const { issueId } = useParams();
  const { t, i18n } = useTranslation();
  const { data, loading, error, transition, reload, applySupport } = useIssueDetail(issueId);
  const meta = useIssueMeta();

  async function handleTransition(status, note) {
    const result = await transition(status, note);
    if (result.success) {
      toast.success(t('issues.transitions.success', { status: t(`issues.statuses.${status}`) }));
    }
    return result;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8" aria-label={t('common.loading')}>
        <div className="mx-auto max-w-3xl space-y-4 px-4">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 text-center">
        <p className="text-slate-600">{error ?? t('issues.errors.notFound')}</p>
        <Link to="/issues">
          <Button variant="outline" className="mt-4">{t('issues.detail.backToFeed')}</Button>
        </Link>
      </div>
    );
  }

  const { issue, updates, viewer } = data;
  const location = issue.location ?? {};

  return (
    <div className="min-h-screen bg-slate-50 py-8 pb-36 md:pb-8">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          to="/issues"
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('issues.detail.backToFeed')}
        </Link>

        <div className="mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={issue.status} />
            <CategoryBadge category={issue.category} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{issue.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t('issues.detail.reportedBy', { name: issue.reporterId?.name ?? '—' })}
            {' · '}
            {formatTxnDate(issue.createdAt, i18n.language)}
          </p>
        </div>

        {issue.photos?.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {issue.photos.map((url) => (
              <img key={url} src={url} alt={issue.title} className="h-44 w-full rounded-xl object-cover" />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <p className="whitespace-pre-line text-slate-700">{issue.description}</p>
                {(location.address || location.city) && (
                  <p className="mt-4 flex items-start gap-1.5 text-sm text-slate-500">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {[location.address, location.city, location.state, location.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('issues.detail.timelineTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline updates={updates} />
              </CardContent>
            </Card>

            {(viewer.isAdmin || viewer.isReporter) && (
              <TransitionPanel issue={issue} viewer={viewer} onTransition={handleTransition} />
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <FundMeter
                  fundPaise={issue.fundPaise}
                  supporterCount={issue.supporterCount}
                  thresholds={meta?.thresholds}
                />
                <div className="mt-4">
                  <SupportPanel issue={issue} viewer={viewer} onSupported={applySupport} onReload={reload} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('support.supportersTitle')}</CardTitle>
              </CardHeader>
              <CardContent>
                <SupportersList key={`${issue._id}-${issue.supporterCount}`} issueId={issue._id} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Link to="/wallet" className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                  {t('issues.detail.walletLink')}
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
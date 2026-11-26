import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBadge, ImportanceBadge, IssueTypeBadge, StatusBadge } from '@/features/global/StatusBadge';
import Timeline from '@/features/global/Timeline';
import TransitionPanel from '@/features/global/TransitionPanel';
import FundMeter from '@/features/global/FundMeter';
import SupportPanel from '@/features/global/SupportPanel';
import SupportersList from '@/features/global/SupportersList';
import OfficialCampaigns from '@/features/global/OfficialCampaigns';
import HelpSpread from '@/features/global/HelpSpread';
import TierBadge from '@/features/global/TierBadge';
import ResolutionCard from '@/features/global/ResolutionCard';
import PoolUtilizationCard from '@/features/global/PoolUtilizationCard';
import PoolFundsGuide from '@/features/global/PoolFundsGuide';
import { useIssueDetail } from '@/features/global/useIssueDetail';
import { formatTxnDate, formatPaise } from '@/features/wallet/money';
import IssueFlagDialog from '@/features/global/IssueFlagDialog';
import { pickIssueText } from '@/features/global/localizeIssue';
import { getStateLabel } from '@/lib/indiaLocations';

const IssueLocationMap = lazy(() => import('@/features/maps/IssueLocationMap'));

export default function IssueDetailPage() {
  const { issueId } = useParams();
  const { t, i18n } = useTranslation();
  const { data, loading, error, transition, reload, applySupport } = useIssueDetail(issueId);

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
        <div className="mx-auto max-w-4xl space-y-4 px-4">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
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

  const { issue: rawIssue, updates, viewer } = data;
  const issue = pickIssueText(rawIssue, i18n.language);
  const location = issue.location ?? {};
  const stateLabel = getStateLabel(location.state, i18n.language);
  const fullLoc = ['India', stateLabel, location.city, location.address, location.pincode].filter(Boolean).join(' · ');
  const showCampaigns = !!issue.explosionTriggered || issue.tier >= 1;

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 pb-36 lg:pb-10">
      <div className="mx-auto max-w-4xl px-4">
        <Link
          to="/issues"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('issues.detail.backToFeed')}
        </Link>

        <div className="mb-6">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={issue.status} />
            <IssueTypeBadge issueType={issue.issueType} />
            <ImportanceBadge importance={issue.importance} />
            <CategoryBadge category={issue.category} />
            <TierBadge explosionTriggered={issue.explosionTriggered} issueType={issue.issueType} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{issue.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t('issues.detail.reportedBy', { name: issue.reporterId?.name ?? '—' })}
            {' · '}
            {formatTxnDate(issue.createdAt, i18n.language)}
          </p>
        </div>

        {issue.photos?.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {issue.photos.map((url) => (
              <img key={url} src={url} alt={issue.title} className="h-44 w-full rounded-2xl object-cover" />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <p className="whitespace-pre-line leading-relaxed text-slate-700">{issue.description}</p>
                {fullLoc && (
                  <p className="mt-4 flex items-start gap-1.5 text-sm font-medium text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {fullLoc}
                  </p>
                )}
                <div className="mt-4">
                  <Suspense fallback={<div className="h-[220px] animate-pulse rounded-xl bg-slate-100" />}>
                    <IssueLocationMap issue={issue} />
                  </Suspense>
                </div>
              </CardContent>
            </Card>

            <ResolutionCard issue={issue} viewer={viewer} onReload={reload} />

            <PoolFundsGuide issue={issue} />

            <PoolUtilizationCard issue={issue} viewer={viewer} onReload={reload} />

            {showCampaigns && <OfficialCampaigns issueId={issue._id} tier={Math.max(1, issue.tier || 1)} />}
            {showCampaigns && <HelpSpread issue={issue} />}

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
                <FundMeter issue={issue} />
                {issue.platformCreditPaise > 0 && (
                  <p className="mt-2 text-xs font-medium text-teal-700">
                    {t('issues.detail.includesCredit', { amount: formatPaise(issue.platformCreditPaise, i18n.language) })}
                  </p>
                )}
                {viewer.myContributionPaise > 0 && (
                  <p className="mt-2 text-xs font-semibold text-primary">
                    {t('support.myContribution', { amount: formatPaise(viewer.myContributionPaise, i18n.language) })}
                  </p>
                )}
                <div className="mt-4">
                  <SupportPanel issue={issue} viewer={viewer} onSupported={applySupport} onReload={reload} />
                </div>
                {viewer.isAuthenticated && !viewer.isReporter && (
                  <div className="mt-3"><IssueFlagDialog issueId={issue._id} /></div>
                )}
              </CardContent>
            </Card>

            <SupportersList issueId={issue._id} reloadKey={issue.supporterCount} />
          </div>
        </div>
      </div>
    </div>
  );
}

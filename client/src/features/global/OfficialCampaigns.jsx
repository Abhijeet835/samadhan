import { useTranslation } from 'react-i18next';
import { ExternalLink, Radio, Sparkles, FileText } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIssueSocial } from './useIssueSocial';

export const PLATFORM_STYLES = {
  X: 'bg-slate-900 text-white',
  FACEBOOK: 'bg-blue-600 text-white',
  INSTAGRAM: 'bg-gradient-to-r from-fuchsia-600 to-amber-500 text-white',
  REDDIT: 'bg-orange-600 text-white',
  WHATSAPP: 'bg-green-600 text-white',
  TELEGRAM: 'bg-sky-500 text-white',
};

const REACH_COLORS = {
  x: 'bg-slate-800',
  fb: 'bg-blue-600',
  ig: 'bg-fuchsia-500',
  rd: 'bg-orange-500',
  tg: 'bg-sky-500',
  wa: 'bg-green-600',
  direct: 'bg-teal-500',
};

/**
 * PROOF of official amplification: per-platform post status + links and a
 * reach-by-source bar. FAILED rows are hidden from the public.
 */
export default function OfficialCampaigns({ issueId, tier = 1 }) {
  const { t } = useTranslation();
  const { data, error } = useIssueSocial(issueId, tier);

  if (error) return null;
  if (!data) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-200" aria-label={t('common.loading')} />;
  }
  if (!data.posts.length) return null;

  const reach = data.reachBySource ?? {};
  const totalReach = Object.values(reach).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <Card className="overflow-hidden border-slate-800/20">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-bold text-white">
          <Radio className="h-4 w-4 text-teal-300" aria-hidden="true" />
          {t('social.officialTitle')}
        </p>
        <p className="mt-1 text-xs text-slate-300">{t('social.officialSubtitle')}</p>
      </div>
      <CardContent className="pt-4">
        <ul className="space-y-2.5">
          {data.posts.map((post) => (
            <li key={post._id} className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide', PLATFORM_STYLES[post.platform])}>
                {post.platform}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                T{post.tier}
              </span>
              {post.status === 'POSTED' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {t('social.posted')}
                </span>
              ) : post.status === 'SIMULATED' ? (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                  {t('social.simulated')}
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  {t('social.pendingReview')}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                {post.generationSource === 'GEMINI' ? (
                  <><Sparkles className="h-3 w-3" aria-hidden="true" />{t('social.aiBadge')}</>
                ) : (
                  <><FileText className="h-3 w-3" aria-hidden="true" />{t('social.templateBadge')}</>
                )}
              </span>
              {post.status === 'POSTED' && post.externalUrl && (
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
            </li>
          ))}
        </ul>

        {totalReach > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500">
              {t('social.reachTitle')} · {t('social.reachViews', { count: totalReach })}
            </p>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
              {Object.entries(REACH_COLORS).map(([source, color]) =>
                reach[source] ? (
                  <div
                    key={source}
                    className={color}
                    style={{ width: `${(reach[source] / totalReach) * 100}%` }}
                    title={`${source}: ${reach[source]}`}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(REACH_COLORS).map(([source, color]) =>
                reach[source] ? (
                  <span key={source} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                    <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
                    {source.toUpperCase()} {reach[source]}
                  </span>
                ) : null,
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

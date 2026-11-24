import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ISSUE_CATEGORIES, ISSUE_STATUSES } from './constants';

export default function IssueFilters({ filters, onChange }) {
  const { t } = useTranslation();

  const set = (patch) => onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder={t('issues.feed.searchPlaceholder')}
          aria-label={t('issues.feed.searchPlaceholder')}
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          value={filters.category}
          onChange={(e) => set({ category: e.target.value })}
          aria-label={t('issues.feed.categoryAll')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('issues.feed.categoryAll')}</option>
          {ISSUE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`issues.categories.${c}`)}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => set({ status: e.target.value })}
          aria-label={t('issues.feed.statusAll')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('issues.feed.statusAll')}</option>
          {ISSUE_STATUSES.filter((s) => s !== 'REJECTED').map((s) => (
            <option key={s} value={s}>{t(`issues.statuses.${s}`)}</option>
          ))}
        </select>
        <select
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value })}
          aria-label={t('issues.feed.sortLabel')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
        >
          <option value="latest">{t('issues.feed.sortLatest')}</option>
          <option value="fund">{t('issues.feed.sortFund')}</option>
          <option value="supporters">{t('issues.feed.sortSupporters')}</option>
        </select>
      </div>
    </div>
  );
}
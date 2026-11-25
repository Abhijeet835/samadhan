import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { INDIA_STATES_AND_UTS } from '@/lib/indiaLocations';
import { IMPORTANCE_LEVELS, ISSUE_CATEGORIES, ISSUE_STATUSES, ISSUE_TYPES } from './constants';

export default function IssueFilters({ filters, onChange }) {
  const { t, i18n } = useTranslation();

  const set = (patch) => onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="surface-card space-y-3 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder={t('issues.feed.searchPlaceholder')}
            aria-label={t('issues.feed.searchPlaceholder')}
            className="field-input pl-10"
          />
        </div>
        <select
          value={filters.state || ''}
          onChange={(e) => set({ state: e.target.value, city: '' })}
          aria-label={t('issues.feed.stateAll')}
          className="field-input"
        >
          <option value="">{t('issues.feed.stateAll')}</option>
          {INDIA_STATES_AND_UTS.map((s) => (
            <option key={s.code} value={s.nameEn}>
              {i18n.language === 'hi' ? s.nameHi : s.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        <select
          value={filters.issueType || ''}
          onChange={(e) => set({ issueType: e.target.value })}
          aria-label={t('issues.feed.typeAll')}
          className="field-input"
        >
          <option value="">{t('issues.feed.typeAll')}</option>
          {ISSUE_TYPES.map((it) => (
            <option key={it} value={it}>{t(`issues.types.${it}`)}</option>
          ))}
        </select>

        <select
          value={filters.importance || ''}
          onChange={(e) => set({ importance: e.target.value })}
          aria-label={t('issues.feed.importanceAll')}
          className="field-input"
        >
          <option value="">{t('issues.feed.importanceAll')}</option>
          {IMPORTANCE_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>{t(`issues.importance.${lvl}`)}</option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(e) => set({ category: e.target.value })}
          aria-label={t('issues.feed.categoryAll')}
          className="field-input"
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
          className="field-input"
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
          className="field-input"
        >
          <option value="latest">{t('issues.feed.sortLatest')}</option>
          <option value="fund">{t('issues.feed.sortFund')}</option>
          <option value="supporters">{t('issues.feed.sortSupporters')}</option>
        </select>
      </div>
    </div>
  );
}

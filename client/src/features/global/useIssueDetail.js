import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '@/lib/api';

export function useIssueDetail(issueId) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/issues/${issueId}`);
      setData(response.data);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      setError(code === 'ISSUE_NOT_FOUND' ? t('issues.errors.notFound') : t('issues.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [issueId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function transition(status, note) {
    try {
      await api.post(`/issues/${issueId}/transition`, { status, note });
      await load();
      return { success: true };
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const key =
        code === 'FORBIDDEN' ? 'issues.errors.forbidden'
        : code === 'INVALID_TRANSITION' ? 'issues.errors.invalidTransition'
        : code === 'REOPEN_WINDOW_EXPIRED' ? 'issues.errors.reopenExpired'
        : 'issues.errors.transitionFailed';
      return { success: false, error: t(key) };
    }
  }

  return { data, loading, error, transition, reload: load };
}
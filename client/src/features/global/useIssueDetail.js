import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import api from '@/lib/api';

const POLL_MS = 10_000;

export function useIssueDetail(issueId) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const response = await api.get(`/issues/${issueId}`);
        setData(response.data);
        if (!silent) setError(null);
      } catch (err) {
        if (silent) return; // keep showing the last good data while polling
        const code = err.response?.data?.error?.code;
        setError(code === 'ISSUE_NOT_FOUND' ? t('issues.errors.notFound') : t('issues.errors.loadFailed'));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [issueId, t],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Live updates: poll every 10 s, pause while the tab is hidden, refresh
  // immediately when it becomes visible again. No websockets in this stack.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true });
    }, POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
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

  /** Apply a support response instantly: fund, count and viewer flags. */
  function applySupport(result) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            issue: {
              ...prev.issue,
              fundPaise: result.issue.fundPaise,
              supporterCount: result.issue.supporterCount,
            },
            viewer: { ...prev.viewer, hasSupported: true, canSupport: false },
          }
        : prev,
    );
  }

  return { data, loading, error, transition, reload: load, applySupport };
}

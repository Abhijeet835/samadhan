import { useEffect, useState } from 'react';
import api from '@/lib/api';

/**
 * Loads social campaign posts and reach stats for an issue, re-fetching when
 * `tier` advances and briefly polling if the tier bundle is still generating.
 */
export function useIssueSocial(issueId, tier = 0) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!issueId || tier < 1) return undefined;
    let active = true;
    let attempts = 0;
    let timerId;

    async function load() {
      try {
        const res = await api.get(`/issues/${issueId}/social`);
        if (!active) return;
        setData(res.data);
        setError(false);

        const hasCurrentTier = res.data.posts?.some((p) => p.tier === tier);
        if (!hasCurrentTier && attempts < 5) {
          attempts += 1;
          timerId = setTimeout(load, 1200);
        }
      } catch {
        if (active) setError(true);
      }
    }

    load();
    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [issueId, tier]);

  return { data, error };
}

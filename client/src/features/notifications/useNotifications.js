import { useCallback, useEffect, useRef, useState } from 'react';

import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * Polls unread-count every 30s ONLY while authenticated and the tab is visible.
 * Exponential backoff on errors (max 5 min), reset on success; stops on logout.
 */
export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const firstLoad = useRef(true);
  const backoff = useRef(30_000);
  const timer = useRef(null);
  const abort = useRef(null);

  const fetchCount = useCallback(async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await api.get('/notifications/unread-count', { signal: controller.signal });
      const next = res.data.unreadCount;
      setUnreadCount((prev) => {
        if (!firstLoad.current && next > prev) {
          // subtle signal handled by the bell badge; no toast spam here
        }
        firstLoad.current = false;
        return next;
      });
      backoff.current = 30_000;
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') backoff.current = Math.min(backoff.current * 2, 300_000);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      firstLoad.current = true;
      return undefined;
    }
    let stopped = false;
    const loop = async () => {
      if (stopped) return;
      if (document.visibilityState === 'visible') await fetchCount();
      timer.current = setTimeout(loop, backoff.current);
    };
    loop();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer.current);
      abort.current?.abort();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [isAuthenticated, fetchCount]);

  return { unreadCount, refresh: fetchCount, setUnreadCount };
}

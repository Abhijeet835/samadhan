import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const NotificationsContext = createContext(null);

/**
 * ONE shared unread-count source for the whole app. The bell and the
 * /notifications page must never keep separate counters, otherwise
 * "Mark all read" leaves a stale red dot on the bell.
 *
 * Polls every 30 s ONLY while authenticated and the tab is visible;
 * exponential backoff (max 5 min) on errors, reset on success; stops on logout.
 */
export function NotificationsProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const firstLoad = useRef(true);
  const previousCount = useRef(0);
  const backoff = useRef(30_000);
  const timer = useRef(null);
  const abort = useRef(null);

  const applyCount = useCallback((next) => {
    const safe = Math.max(0, Number(next) || 0);
    previousCount.current = safe;
    setUnreadCount(safe);
    return safe;
  }, []);

  const refresh = useCallback(async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await api.get('/notifications/unread-count', { signal: controller.signal });
      const next = Number(res.data?.unreadCount ?? 0);

      if (!firstLoad.current && next > previousCount.current) {
        toast.success(t('notifications.newAlert', { count: next - previousCount.current }), {
          icon: '🔔',
          duration: 5000,
        });
      }
      firstLoad.current = false;
      backoff.current = 30_000;
      return applyCount(next);
    } catch (error) {
      const cancelled = error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';
      if (!cancelled) backoff.current = Math.min(backoff.current * 2, 300_000);
      return previousCount.current;
    }
  }, [applyCount, t]);

  useEffect(() => {
    if (!isAuthenticated) {
      firstLoad.current = true;
      previousCount.current = 0;
      setUnreadCount(0);
      clearTimeout(timer.current);
      abort.current?.abort();
      return undefined;
    }

    let stopped = false;
    const loop = async () => {
      if (stopped) return;
      if (document.visibilityState === 'visible') await refresh();
      if (!stopped) timer.current = setTimeout(loop, backoff.current);
    };

    firstLoad.current = true;
    loop();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
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
  }, [isAuthenticated, user?._id, refresh]);

  const markRead = useCallback(async (id) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return applyCount(res.data?.unreadCount ?? previousCount.current - 1);
  }, [applyCount]);

  const markAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      const res = await api.post('/notifications/read-all');
      applyCount(res.data?.unreadCount ?? 0);
      return res.data;
    } finally {
      setMarkingAll(false);
    }
  }, [applyCount]);

  const value = {
    unreadCount,
    markingAll,
    refresh,
    markRead,
    markAllRead,
    setUnreadCount: applyCount,
    navigateToNotifications: () => navigate('/notifications'),
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}

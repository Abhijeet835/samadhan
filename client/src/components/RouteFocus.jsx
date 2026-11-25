import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TITLES = {
  '/': 'meta.title', '/issues': 'issues.feed.title', '/trending': 'trending.title',
  '/map': 'maps.title', '/report': 'report.title', '/wallet': 'wallet.title',
  '/profile': 'profile.title', '/my-activity': 'myActivity.title', '/notifications': 'notifications.title',
  '/local': 'local.title', '/local/search': 'local.searchTitle', '/local/register': 'local.registerTitle',
  '/local/dashboard': 'local.dashboardTitle', '/admin': 'admin.title', '/login': 'auth.login.title', '/register': 'auth.register.title',
};

/** Per-route document.title + move focus to the page heading on navigation. */
export default function RouteFocus() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const base = '/' + pathname.split('/').filter(Boolean)[0] || '/';
    const key = TITLES[pathname] ?? TITLES[base] ?? 'meta.title';
    document.title = `${t(key)} · Samadhan`;
    const main = document.getElementById('main-content');
    if (main) {
      const h = main.querySelector('h1') ?? main;
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }, [pathname, t, i18n.language]);

  return null;
}

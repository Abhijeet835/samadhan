import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';

export default function SiteLayout() {
  const { t } = useTranslation();

  return (
    <div id="top" className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        {t('common.skipToContent')}
      </a>

      <Navbar />

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}

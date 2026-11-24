import { BookOpen, Home, Languages, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { cn } from '@/lib/utils';

const itemClass =
  'flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-center text-[10px] font-medium leading-tight text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export default function BottomNav() {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const isHindi = i18n.language?.startsWith('hi');

  const toggleLanguage = () => {
    i18n.changeLanguage(isHindi ? 'en' : 'hi');
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-xl md:hidden"
      aria-label={t('nav.mobile')}
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        <Link
          to="/"
          className={cn(itemClass, location.pathname === '/' && 'bg-primary/10 text-primary')}
          aria-current={location.pathname === '/' ? 'page' : undefined}
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.home')}</span>
        </Link>

        <a href="#how-it-works" className={itemClass}>
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          <span className="w-full">{t('nav.howItWorks')}</span>
        </a>

        <a href="#modes" className={itemClass}>
          <Layers className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.modes')}</span>
        </a>

        <button type="button" onClick={toggleLanguage} className={itemClass}>
          <Languages className="h-5 w-5" aria-hidden="true" />
          <span className="w-full truncate">{t('nav.language')}</span>
        </button>
      </div>
    </nav>
  );
}

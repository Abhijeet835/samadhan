import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

const LANGUAGES = ['en', 'hi'];

export default function LanguageToggle({ className, showIcon = true }) {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language?.startsWith('hi') ? 'hi' : 'en';

  const changeLanguage = (language) => {
    if (language !== currentLanguage) {
      i18n.changeLanguage(language);
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/70 p-0.5',
        className,
      )}
      role="group"
      aria-label={t('nav.language')}
    >
      {showIcon ? (
        <Languages className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      ) : null}
      {LANGUAGES.map((language) => {
        const isActive = currentLanguage === language;
        const label = language === 'en' ? t('nav.english') : t('nav.hindi');

        return (
          <button
            key={language}
            type="button"
            onClick={() => changeLanguage(language)}
            aria-pressed={isActive}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors sm:text-xs',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

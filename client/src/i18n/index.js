import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';

const STORAGE_KEY = 'samadhan.language';
const SUPPORTED_LANGUAGES = ['en', 'hi'];

const storedLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
const initialLanguage = SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : 'en';

const initPromise = i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

const syncDocumentMetadata = (language) => {
  if (typeof document === 'undefined') return;

  const safeLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  document.documentElement.lang = safeLanguage;
  document.title = i18n.t('meta.title');

  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute('content', i18n.t('meta.description'));
  }
};

i18n.on('languageChanged', (language) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, language);
  }
  syncDocumentMetadata(language);
});

initPromise.then(() => syncDocumentMetadata(i18n.language));

export default i18n;

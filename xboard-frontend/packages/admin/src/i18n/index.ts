/**
 * i18n Configuration
 * Internationalization setup for the admin application
 */

import { createI18n } from 'vue-i18n';
import en from './locales/en';
import zh from './locales/zh';

// Detect browser language
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language?.split('-')[0] || 'en';
  return ['en', 'zh'].includes(browserLang) ? browserLang : 'en';
};

// Get saved language or use Chinese as default
const getInitialLocale = (): string => {
  const savedLocale = localStorage.getItem('locale');
  if (savedLocale && ['en', 'zh'].includes(savedLocale)) {
    return savedLocale;
  }
  // Default to Chinese
  return 'zh';
};

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'zh',
  messages: {
    en,
    zh,
  },
});

export default i18n;

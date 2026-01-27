import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zh from './locales/zh'

// Detect browser language
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language?.split('-')[0] || 'en'
  return ['en', 'zh'].includes(browserLang) ? browserLang : 'en'
}

// Get saved language or detect from browser
const getInitialLocale = (): string => {
  const savedLocale = localStorage.getItem('language')
  if (savedLocale && ['en', 'zh'].includes(savedLocale)) {
    return savedLocale
  }
  return getBrowserLanguage()
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    zh
  }
})

export default i18n

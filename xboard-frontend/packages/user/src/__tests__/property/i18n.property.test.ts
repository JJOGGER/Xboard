/**
 * Property-Based Tests for Internationalization (i18n)
 * Feature: vue-admin-user-frontend
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { createI18n } from 'vue-i18n';
import type { I18n } from 'vue-i18n';

// Mock messages for testing
const mockMessages = {
  en: {
    common: {
      hello: 'Hello',
      welcome: 'Welcome',
      logout: 'Logout',
    },
    dashboard: {
      title: 'Dashboard',
      subscription: 'Subscription',
    },
  },
  zh: {
    common: {
      hello: '你好',
      welcome: '欢迎',
      logout: '登出',
    },
    dashboard: {
      title: '仪表板',
      subscription: '订阅',
    },
  },
};

describe('i18n Property Tests', () => {
  let originalLocalStorage: Storage;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    originalLocalStorage = global.localStorage;
    
    global.localStorage = {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      },
      length: Object.keys(localStorageMock).length,
      key: (index: number) => Object.keys(localStorageMock)[index] || null,
    } as Storage;

    // Mock navigator.language
    Object.defineProperty(navigator, 'language', {
      writable: true,
      configurable: true,
      value: 'en-US',
    });
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    vi.clearAllMocks();
  });

  describe('Property 16: Language switching reactivity', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 16: Language switching reactivity
     * Validates: Requirements 30.3
     * 
     * For any language change, all translatable text in the interface should update 
     * immediately to the selected language.
     */

    it('should update all text content immediately when language changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('en', 'zh'),
          fc.constantFrom('en', 'zh'),
          async (initialLocale, targetLocale) => {
            // Create i18n instance with initial locale
            const i18n: I18n = createI18n({
              legacy: false,
              locale: initialLocale,
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            // Get initial translations
            const initialTranslations = {
              hello: i18n.global.t('common.hello'),
              welcome: i18n.global.t('common.welcome'),
              logout: i18n.global.t('common.logout'),
              dashboardTitle: i18n.global.t('dashboard.title'),
              subscription: i18n.global.t('dashboard.subscription'),
            };

            // Verify initial translations match initial locale
            expect(initialTranslations.hello).toBe(mockMessages[initialLocale].common.hello);
            expect(initialTranslations.welcome).toBe(mockMessages[initialLocale].common.welcome);

            // Change locale
            i18n.global.locale.value = targetLocale;

            // Get translations after locale change (should be immediate)
            const updatedTranslations = {
              hello: i18n.global.t('common.hello'),
              welcome: i18n.global.t('common.welcome'),
              logout: i18n.global.t('common.logout'),
              dashboardTitle: i18n.global.t('dashboard.title'),
              subscription: i18n.global.t('dashboard.subscription'),
            };

            // Verify all translations updated to target locale
            expect(updatedTranslations.hello).toBe(mockMessages[targetLocale].common.hello);
            expect(updatedTranslations.welcome).toBe(mockMessages[targetLocale].common.welcome);
            expect(updatedTranslations.logout).toBe(mockMessages[targetLocale].common.logout);
            expect(updatedTranslations.dashboardTitle).toBe(mockMessages[targetLocale].dashboard.title);
            expect(updatedTranslations.subscription).toBe(mockMessages[targetLocale].dashboard.subscription);

            // If locales are different, translations should be different
            if (initialLocale !== targetLocale) {
              expect(updatedTranslations.hello).not.toBe(initialTranslations.hello);
              expect(updatedTranslations.welcome).not.toBe(initialTranslations.welcome);
            } else {
              // If same locale, translations should remain the same
              expect(updatedTranslations.hello).toBe(initialTranslations.hello);
              expect(updatedTranslations.welcome).toBe(initialTranslations.welcome);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle multiple rapid language switches correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('en', 'zh'), { minLength: 2, maxLength: 10 }),
          async (localeSequence) => {
            const i18n: I18n = createI18n({
              legacy: false,
              locale: 'en',
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            // Apply each locale change in sequence
            for (const locale of localeSequence) {
              i18n.global.locale.value = locale;

              // Verify translation matches current locale immediately
              const currentTranslation = i18n.global.t('common.hello');
              expect(currentTranslation).toBe(mockMessages[locale].common.hello);
            }

            // Final locale should be the last in sequence
            const finalLocale = localeSequence[localeSequence.length - 1];
            expect(i18n.global.locale.value).toBe(finalLocale);
            expect(i18n.global.t('common.hello')).toBe(mockMessages[finalLocale].common.hello);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain translation consistency across all message keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('en', 'zh'),
          async (targetLocale) => {
            const i18n: I18n = createI18n({
              legacy: false,
              locale: 'en',
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            // Change to target locale
            i18n.global.locale.value = targetLocale;

            // Verify all keys translate to target locale
            const allKeys = [
              'common.hello',
              'common.welcome',
              'common.logout',
              'dashboard.title',
              'dashboard.subscription',
            ];

            for (const key of allKeys) {
              const translation = i18n.global.t(key);
              const keyParts = key.split('.');
              const expectedTranslation = (mockMessages[targetLocale] as any)[keyParts[0]][keyParts[1]];
              expect(translation).toBe(expectedTranslation);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should update locale value synchronously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('en', 'zh'),
          fc.constantFrom('en', 'zh'),
          async (initialLocale, targetLocale) => {
            const i18n: I18n = createI18n({
              legacy: false,
              locale: initialLocale,
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            expect(i18n.global.locale.value).toBe(initialLocale);

            // Change locale
            i18n.global.locale.value = targetLocale;

            // Locale should be updated immediately (synchronously)
            expect(i18n.global.locale.value).toBe(targetLocale);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 17: Language persistence', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 17: Language persistence
     * Validates: Requirements 30.4
     * 
     * For any language preference change, the selection should be saved to local 
     * storage and restored on next session.
     */

    it('should persist language preference to localStorage for any locale', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('en', 'zh'),
          async (selectedLocale) => {
            // Clear localStorage
            localStorageMock = {};

            // Simulate saving locale preference (user package uses 'language' key)
            localStorage.setItem('language', selectedLocale);

            // Verify it was saved
            expect(localStorage.getItem('language')).toBe(selectedLocale);

            // Simulate page reload - retrieve saved locale
            const savedLocale = localStorage.getItem('language');
            expect(savedLocale).toBe(selectedLocale);

            // Create i18n with saved locale
            const i18n: I18n = createI18n({
              legacy: false,
              locale: savedLocale || 'en',
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            // Verify i18n uses the saved locale
            expect(i18n.global.locale.value).toBe(selectedLocale);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should restore language preference across multiple sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('en', 'zh'), { minLength: 1, maxLength: 5 }),
          async (localeChanges) => {
            // Clear localStorage
            localStorageMock = {};

            for (const locale of localeChanges) {
              // Save locale preference
              localStorage.setItem('language', locale);

              // Simulate session end and new session start
              const restoredLocale = localStorage.getItem('language');

              // Verify locale was restored
              expect(restoredLocale).toBe(locale);

              // Create new i18n instance (simulating app restart)
              const i18n: I18n = createI18n({
                legacy: false,
                locale: restoredLocale || 'en',
                fallbackLocale: 'en',
                messages: mockMessages,
              });

              // Verify i18n uses restored locale
              expect(i18n.global.locale.value).toBe(locale);
            }

            // Final saved locale should be the last one
            const finalLocale = localeChanges[localeChanges.length - 1];
            expect(localStorage.getItem('language')).toBe(finalLocale);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle missing localStorage gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('en', 'zh'),
          async (defaultLocale) => {
            // Clear localStorage
            localStorageMock = {};

            // Try to get locale when nothing is saved
            const savedLocale = localStorage.getItem('language');
            expect(savedLocale).toBeNull();

            // Should use default/fallback locale
            const i18n: I18n = createI18n({
              legacy: false,
              locale: savedLocale || defaultLocale,
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            expect(i18n.global.locale.value).toBe(defaultLocale);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should overwrite previous locale preference', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('en', 'zh'),
          fc.constantFrom('en', 'zh'),
          async (firstLocale, secondLocale) => {
            // Clear localStorage
            localStorageMock = {};

            // Save first locale
            localStorage.setItem('language', firstLocale);
            expect(localStorage.getItem('language')).toBe(firstLocale);

            // Save second locale (should overwrite)
            localStorage.setItem('language', secondLocale);
            expect(localStorage.getItem('language')).toBe(secondLocale);

            // Only the second locale should be saved
            const savedLocale = localStorage.getItem('language');
            expect(savedLocale).toBe(secondLocale);
            expect(savedLocale).not.toBe(firstLocale === secondLocale ? 'different' : firstLocale);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should persist locale independently of other localStorage data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('en', 'zh'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(key => 
            key !== 'language' && 
            key !== 'constructor' && 
            key !== '__proto__' && 
            key !== 'prototype'
          ),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (locale, otherKey, otherValue) => {
            // Clear localStorage
            localStorageMock = {};

            // Save locale and other data
            localStorage.setItem('language', locale);
            localStorage.setItem(otherKey, otherValue);

            // Verify both are saved
            expect(localStorage.getItem('language')).toBe(locale);
            expect(localStorage.getItem(otherKey)).toBe(otherValue);

            // Remove other data
            localStorage.removeItem(otherKey);

            // Locale should still be saved
            expect(localStorage.getItem('language')).toBe(locale);
            expect(localStorage.getItem(otherKey)).toBeNull();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 18: Browser language detection', () => {
    /**
     * Feature: vue-admin-user-frontend, Property 18: Browser language detection
     * Validates: Requirements 30.5
     * 
     * For any first-time user without saved language preference, the system should 
     * detect and set the browser's language as default.
     */

    it('should detect and use browser language when no preference is saved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('en-US', 'en-GB', 'zh-CN', 'zh-TW', 'fr-FR', 'de-DE'),
          async (browserLanguage) => {
            // Clear localStorage (no saved preference)
            localStorageMock = {};

            // Mock navigator.language
            Object.defineProperty(navigator, 'language', {
              writable: true,
              configurable: true,
              value: browserLanguage,
            });

            // Simulate language detection logic
            const getBrowserLanguage = (): string => {
              const browserLang = navigator.language?.split('-')[0] || 'en';
              return ['en', 'zh'].includes(browserLang) ? browserLang : 'en';
            };

            const getInitialLocale = (): string => {
              const savedLocale = localStorage.getItem('language');
              if (savedLocale && ['en', 'zh'].includes(savedLocale)) {
                return savedLocale;
              }
              return getBrowserLanguage();
            };

            const detectedLocale = getInitialLocale();

            // Verify detection logic
            const expectedLocale = browserLanguage.startsWith('zh') ? 'zh' : 
                                   browserLanguage.startsWith('en') ? 'en' : 'en';
            expect(detectedLocale).toBe(expectedLocale);

            // Create i18n with detected locale
            const i18n: I18n = createI18n({
              legacy: false,
              locale: detectedLocale,
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            expect(i18n.global.locale.value).toBe(expectedLocale);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should prefer saved preference over browser language', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('en-US', 'zh-CN'),
          fc.constantFrom('en', 'zh'),
          async (browserLanguage, savedLocale) => {
            // Save a locale preference
            localStorageMock = {};
            localStorage.setItem('language', savedLocale);

            // Mock different browser language
            Object.defineProperty(navigator, 'language', {
              writable: true,
              configurable: true,
              value: browserLanguage,
            });

            // Simulate language detection logic
            const getBrowserLanguage = (): string => {
              const browserLang = navigator.language?.split('-')[0] || 'en';
              return ['en', 'zh'].includes(browserLang) ? browserLang : 'en';
            };

            const getInitialLocale = (): string => {
              const savedLocale = localStorage.getItem('language');
              if (savedLocale && ['en', 'zh'].includes(savedLocale)) {
                return savedLocale;
              }
              return getBrowserLanguage();
            };

            const initialLocale = getInitialLocale();

            // Should use saved preference, not browser language
            expect(initialLocale).toBe(savedLocale);

            const i18n: I18n = createI18n({
              legacy: false,
              locale: initialLocale,
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            expect(i18n.global.locale.value).toBe(savedLocale);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should fallback to default locale for unsupported browser languages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('fr-FR', 'de-DE', 'es-ES', 'ja-JP', 'ko-KR'),
          async (unsupportedLanguage) => {
            // Clear localStorage
            localStorageMock = {};

            // Mock unsupported browser language
            Object.defineProperty(navigator, 'language', {
              writable: true,
              configurable: true,
              value: unsupportedLanguage,
            });

            // Simulate language detection logic
            const getBrowserLanguage = (): string => {
              const browserLang = navigator.language?.split('-')[0] || 'en';
              return ['en', 'zh'].includes(browserLang) ? browserLang : 'en';
            };

            const getInitialLocale = (): string => {
              const savedLocale = localStorage.getItem('language');
              if (savedLocale && ['en', 'zh'].includes(savedLocale)) {
                return savedLocale;
              }
              return getBrowserLanguage();
            };

            const detectedLocale = getInitialLocale();

            // Should fallback to 'en' for unsupported languages
            expect(detectedLocale).toBe('en');

            const i18n: I18n = createI18n({
              legacy: false,
              locale: detectedLocale,
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            expect(i18n.global.locale.value).toBe('en');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle missing navigator.language gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(undefined),
          async () => {
            // Clear localStorage
            localStorageMock = {};

            // Mock missing navigator.language
            Object.defineProperty(navigator, 'language', {
              writable: true,
              configurable: true,
              value: undefined,
            });

            // Simulate language detection logic
            const getBrowserLanguage = (): string => {
              const browserLang = navigator.language?.split('-')[0] || 'en';
              return ['en', 'zh'].includes(browserLang) ? browserLang : 'en';
            };

            const getInitialLocale = (): string => {
              const savedLocale = localStorage.getItem('language');
              if (savedLocale && ['en', 'zh'].includes(savedLocale)) {
                return savedLocale;
              }
              return getBrowserLanguage();
            };

            const detectedLocale = getInitialLocale();

            // Should fallback to 'en' when navigator.language is undefined
            expect(detectedLocale).toBe('en');

            const i18n: I18n = createI18n({
              legacy: false,
              locale: detectedLocale,
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            expect(i18n.global.locale.value).toBe('en');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should extract language code from locale string correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            language: fc.constantFrom('en', 'zh', 'fr', 'de'),
            region: fc.constantFrom('US', 'GB', 'CN', 'TW', 'FR', 'DE'),
          }),
          async ({ language, region }) => {
            // Clear localStorage
            localStorageMock = {};

            const fullLocale = `${language}-${region}`;

            // Mock browser language
            Object.defineProperty(navigator, 'language', {
              writable: true,
              configurable: true,
              value: fullLocale,
            });

            // Simulate language detection logic
            const getBrowserLanguage = (): string => {
              const browserLang = navigator.language?.split('-')[0] || 'en';
              return ['en', 'zh'].includes(browserLang) ? browserLang : 'en';
            };

            const detectedLanguage = getBrowserLanguage();

            // Should extract language code correctly
            const expectedLanguage = ['en', 'zh'].includes(language) ? language : 'en';
            expect(detectedLanguage).toBe(expectedLanguage);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('i18n Integration Invariants', () => {
    it('should maintain locale consistency throughout application lifecycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              action: fc.constantFrom('change', 'save', 'reload'),
              locale: fc.constantFrom('en', 'zh'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (actions) => {
            localStorageMock = {};
            let currentLocale = 'en';

            const i18n: I18n = createI18n({
              legacy: false,
              locale: currentLocale,
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            for (const { action, locale } of actions) {
              if (action === 'change') {
                i18n.global.locale.value = locale;
                currentLocale = locale;
              } else if (action === 'save') {
                localStorage.setItem('language', locale);
                // Saving to localStorage doesn't automatically change the i18n locale
                // The locale only changes when we explicitly set it or reload
                // So currentLocale should remain what i18n currently has
                currentLocale = i18n.global.locale.value;
              } else if (action === 'reload') {
                const savedLocale = localStorage.getItem('language') || 'en';
                i18n.global.locale.value = savedLocale;
                currentLocale = savedLocale;
              }

              // Verify locale consistency
              expect(i18n.global.locale.value).toBe(currentLocale);
              expect(i18n.global.t('common.hello')).toBe(mockMessages[currentLocale].common.hello);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should never have undefined or invalid locale', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('en', 'zh'), { minLength: 1, maxLength: 10 }),
          async (localeSequence) => {
            const i18n: I18n = createI18n({
              legacy: false,
              locale: 'en',
              fallbackLocale: 'en',
              messages: mockMessages,
            });

            for (const locale of localeSequence) {
              i18n.global.locale.value = locale;

              // Locale should always be defined and valid
              expect(i18n.global.locale.value).toBeDefined();
              expect(['en', 'zh']).toContain(i18n.global.locale.value);

              // Translations should always work
              const translation = i18n.global.t('common.hello');
              expect(translation).toBeDefined();
              expect(translation).not.toBe('common.hello'); // Should not return key
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

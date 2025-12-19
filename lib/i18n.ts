'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .use(
        resourcesToBackend((language: string, namespace: string) => {
            // Handle pt-BR by loading pt translations
            const lang = language === 'pt-BR' ? 'pt' : language;
            return import(`../public/locales/${lang}/${namespace}.json`);
        })
    )
    .init({
        fallbackLng: 'en',
        supportedLngs: ['en', 'pt', 'pt-BR'],
        defaultNS: 'common',
        ns: ['common'],
        debug: process.env.NODE_ENV === 'development',
        interpolation: {
            escapeValue: false, // React already safes from xss
        },
        detection: {
            order: ['cookie', 'localStorage', 'navigator'],
            caches: ['cookie', 'localStorage'],
        },
    });

export default i18n;

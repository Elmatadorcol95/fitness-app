import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import es from './locales/es.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const languageTag = Localization.getLocales()[0]?.languageTag ?? 'es';
const languageCode = languageTag.split('-')[0];
const supportedLanguages = ['es', 'en', 'fr'];
const fallback = supportedLanguages.includes(languageCode) ? languageCode : 'es';

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en }, fr: { translation: fr } },
  lng: fallback,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;

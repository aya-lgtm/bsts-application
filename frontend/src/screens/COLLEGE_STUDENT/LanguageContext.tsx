import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { translations, Lang, t as translate } from './translations';

// ─── Types ────────────────────────────────────────────────────────────────────
interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (section: keyof typeof translations, key: string) => string;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const LanguageContext = createContext<LanguageContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (section, key) => key,
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Lang>('fr');

  // Charger la langue sauvegardée au démarrage
  useEffect(() => {
    SecureStore.getItemAsync('app_language').then(stored => {
      if (stored === 'fr' || stored === 'en') setLangState(stored);
    });
  }, []);

  // Sauvegarder la langue dans SecureStore
  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    await SecureStore.setItemAsync('app_language', l);
  }, []);

  // Fonction de traduction liée à la langue courante
  const t = useCallback(
    (section: keyof typeof translations, key: string) => translate(section, key, lang),
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useLanguage = () => useContext(LanguageContext);
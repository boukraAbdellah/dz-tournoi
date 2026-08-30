import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { changeLanguage } from 'i18next';

export type Language = 'fr' | 'ar';
export type AppTheme = 'light' | 'dark';

interface AppSettings {
  lang: Language;
  setLang: (l: Language) => void;
  rtl: boolean;
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  dark: boolean;
  toggleTheme: () => void;
}

const SettingsContext = createContext<AppSettings>({
  lang: 'fr',
  setLang: () => {},
  rtl: false,
  theme: 'light',
  setTheme: () => {},
  dark: false,
  toggleTheme: () => {},
});

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (raw as T);
  } catch {
    return fallback;
  }
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => readStorage<Language>('lang', 'fr'));
  const [theme, setThemeState] = useState<AppTheme>(() => readStorage<AppTheme>('theme', 'light'));

  useEffect(() => {
    void changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('lang', l);
    void changeLanguage(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  };

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
  };

  const dark = theme === 'dark';
  const toggleTheme = () => setTheme(dark ? 'light' : 'dark');

  const value = useMemo(
    () => ({ lang, setLang, rtl: lang === 'ar', theme, setTheme, dark, toggleTheme }),
    [lang, theme, dark],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings(): AppSettings {
  return useContext(SettingsContext);
}

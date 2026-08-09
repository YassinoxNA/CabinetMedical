import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type AppLanguage = "fr" | "ar";

interface LanguageContextValue {
  language: AppLanguage;
  isArabic: boolean;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  text: (french: string, arabic: string) => string;
  locale: "fr-MA" | "ar-MA";
}

const LANGUAGE_STORAGE_KEY = "dental-sabri-language";

function readStoredLanguage(): AppLanguage {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "ar" ? "ar" : "fr";
  } catch {
    return "fr";
  }
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(readStoredLanguage);
  const isArabic = language === "ar";

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Le choix reste actif pour la session si le stockage local est indisponible.
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "fr" ? "ar" : "fr");
  }, [language, setLanguage]);

  const text = useCallback(
    (french: string, arabic: string) => (isArabic ? arabic : french),
    [isArabic]
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    document.body.dir = isArabic ? "rtl" : "ltr";
  }, [isArabic, language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isArabic,
      setLanguage,
      toggleLanguage,
      text,
      locale: isArabic ? "ar-MA" : "fr-MA"
    }),
    [isArabic, language, setLanguage, text, toggleLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage doit être utilisé dans LanguageProvider.");
  }
  return context;
}

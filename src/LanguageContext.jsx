import { createContext, useContext, useState } from "react";
import { translations } from "./i18n";

const DUTCH_DAYS = translations.nl.days;
const LS_LANG = "familie-eten:lang";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(LS_LANG) || "nl"
  );

  const setLang = (code) => {
    localStorage.setItem(LS_LANG, code);
    setLangState(code);
  };

  const tr = translations[lang] ?? translations.nl;

  const t = (key, vars = {}) => {
    const val = tr[key] ?? translations.nl[key] ?? key;
    if (typeof val !== "string") return val;
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
      val
    );
  };

  // Converts a Dutch day name (used as storage key) to the current language.
  const tDay = (dutchDay) => {
    const idx = DUTCH_DAYS.indexOf(dutchDay);
    return idx >= 0 ? (tr.days?.[idx] ?? dutchDay) : dutchDay;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tDay }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

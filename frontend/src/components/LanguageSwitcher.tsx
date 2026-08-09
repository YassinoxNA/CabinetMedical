import { Languages } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, text } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm ${
        compact ? "gap-0.5" : "gap-1"
      }`}
      role="group"
      aria-label={text("Choisir la langue", "اختيار اللغة")}
    >
      {!compact && <Languages className="mx-1 size-4 text-teal-700" aria-hidden="true" />}
      <button
        type="button"
        className={`rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold transition ${
          language === "fr"
            ? "bg-teal-700 text-white shadow-sm"
            : "text-slate-500 hover:bg-slate-50"
        }`}
        aria-pressed={language === "fr"}
        onClick={() => setLanguage("fr")}
      >
        FR
      </button>
      <button
        type="button"
        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition ${
          language === "ar"
            ? "bg-teal-700 text-white shadow-sm"
            : "text-slate-500 hover:bg-slate-50"
        }`}
        aria-pressed={language === "ar"}
        onClick={() => setLanguage("ar")}
      >
        العربية
      </button>
    </div>
  );
}

import { defineRouting } from "next-intl/routing";

export const localeLabels: Record<string, { label: string; flag: string }> = {
  tr: { label: "TR", flag: "🇹🇷" },
  en: { label: "EN", flag: "🇬🇧" },
  es: { label: "ES", flag: "🇪🇸" },
  fr: { label: "FR", flag: "🇫🇷" },
  de: { label: "DE", flag: "🇩🇪" },
  ar: { label: "AR", flag: "🇸🇦" },
  pt: { label: "PT", flag: "🇧🇷" },
  rw: { label: "RW", flag: "🇷🇼" },
  sw: { label: "SW", flag: "🇹🇿" },
  am: { label: "AM", flag: "🇪🇹" },
};

export const routing = defineRouting({
  locales: ["tr", "en", "es", "fr", "de", "ar", "pt", "rw", "sw", "am"],
  defaultLocale: "tr",
  localeDetection: false,
});

export const COUNTRIES = {
  TR: {
    code: "TR",
    name: "Türkiye",
    flag: "🇹🇷",
    defaultLocale: "tr",
    locales: ["tr", "en"],
    currency: "TRY",
    newsKeywords: ["Türkiye", "Turkey", "TCMB", "TBMM", "Erdoğan", "İstanbul", "Ankara"],
  },
  DE: {
    code: "DE",
    name: "Deutschland",
    flag: "🇩🇪",
    defaultLocale: "de",
    locales: ["de", "en"],
    currency: "EUR",
    newsKeywords: ["Germany", "Deutschland", "Bundestag", "Berlin", "Scholz", "Bundesbank", "EU"],
  },
  FR: {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    defaultLocale: "fr",
    locales: ["fr", "en"],
    currency: "EUR",
    newsKeywords: ["France", "Macron", "Paris", "Assemblée nationale", "Élysée", "EU"],
  },
  BR: {
    code: "BR",
    name: "Brasil",
    flag: "🇧🇷",
    defaultLocale: "pt",
    locales: ["pt", "en"],
    currency: "BRL",
    newsKeywords: ["Brazil", "Brasil", "Lula", "Brasília", "Bovespa", "Real", "São Paulo"],
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    defaultLocale: "en",
    locales: ["en"],
    currency: "GBP",
    newsKeywords: ["UK", "Britain", "London", "Parliament", "NHS", "Bank of England", "Starmer"],
  },
  ES: {
    code: "ES",
    name: "España",
    flag: "🇪🇸",
    defaultLocale: "es",
    locales: ["es", "en"],
    currency: "EUR",
    newsKeywords: ["Spain", "España", "Madrid", "Sánchez", "Congreso", "La Liga", "EU"],
  },
  EG: {
    code: "EG",
    name: "مصر",
    flag: "🇪🇬",
    defaultLocale: "ar",
    locales: ["ar", "en"],
    currency: "EGP",
    newsKeywords: ["Egypt", "مصر", "Cairo", "القاهرة", "Sisi", "Suez", "Nile"],
  },
} as const;

export type CountryCode = keyof typeof COUNTRIES;

export const COUNTRY_LIST = Object.values(COUNTRIES);

export function getCountry(code: string) {
  return COUNTRIES[code as CountryCode] || COUNTRIES.TR;
}

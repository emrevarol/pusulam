export const DAILY_FREE_OY_HAKKI = 3;
export const INITIAL_OY_HAKKI = 50;

export const OY_HAKKI_PACKAGES = [
  { id: "oh_25", amount: 25, priceUsd: 3, priceCents: 300 },
  { id: "oh_75", amount: 75, priceUsd: 7, priceCents: 700 },
  { id: "oh_200", amount: 200, priceUsd: 15, priceCents: 1500 },
] as const;

export function getTodayIstanbul(): Date {
  const now = new Date();
  const istanbulStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  return new Date(istanbulStr + "T00:00:00.000Z");
}

// Legacy exports for any remaining imports
export const DAILY_FREE_PREDICTIONS = DAILY_FREE_OY_HAKKI;
export const VALID_WEIGHTS = [1] as const;
export const CREDIT_PACKAGES = OY_HAKKI_PACKAGES;
export function getCreditsRequired(): number { return 0; }

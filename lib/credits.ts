export const DAILY_FREE_PREDICTIONS = 3;

export const VALID_WEIGHTS = [1, 2, 5, 10] as const;

export const CREDIT_PACKAGES = [
  { id: "credits_50", credits: 50, priceUsd: 5, priceCents: 500, label: "50 Kredi" },
  { id: "credits_150", credits: 150, priceUsd: 12, priceCents: 1200, label: "150 Kredi" },
  { id: "credits_500", credits: 500, priceUsd: 35, priceCents: 3500, label: "500 Kredi" },
] as const;

export function getCreditsRequired(weight: number, isFree: boolean): number {
  if (weight === 1 && isFree) return 0;
  if (weight === 1) return 1;
  return weight;
}

export function getTodayIstanbul(): Date {
  const now = new Date();
  const istanbulStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  return new Date(istanbulStr + "T00:00:00.000Z");
}

// Plan tier configuration — Premium = ~20x Free

export const TIERS = {
  FREE: {
    label: "Ücretsiz",
    chatPerHour: 20,
    chatModel: "claude-haiku-4-5-20251001" as const,
    webSearchPerChat: 2,
    dailyOyHakki: 3,
    maxConversations: 10,
    streakFreezesPerMonth: 0,
    advancedStats: false,
    premiumBadge: false,
  },
  PREMIUM: {
    label: "Premium",
    chatPerHour: 400,
    chatModel: "claude-sonnet-4-6" as const,
    webSearchPerChat: 6,
    dailyOyHakki: 60,
    maxConversations: 200,
    streakFreezesPerMonth: 3,
    advancedStats: true,
    premiumBadge: true,
  },
} as const;

export type PlanType = keyof typeof TIERS;

export function getTier(plan: string) {
  return TIERS[plan as PlanType] || TIERS.FREE;
}

// Stripe price for premium subscription
export const PREMIUM_PRICE_MONTHLY_USD = 5;
export const PREMIUM_STRIPE_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || "";

export interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  endDate: string;
  outcomePrices: string; // JSON string like "[0.55, 0.45]"
  volume: number;
  liquidity: number;
  active: boolean;
  closed: boolean;
  category: string;
}

export async function fetchTrendingMarkets(limit = 20): Promise<PolymarketMarket[]> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?limit=${limit}&active=true&closed=false&order=volume&ascending=false`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    // Filter out sports markets
    const sportsKeywords = ["nba", "nfl", "mlb", "nhl", "soccer", "football match", "championship game", "world cup", "premier league", "champions league", "super bowl"];
    return (data as PolymarketMarket[]).filter((m) => {
      const q = m.question.toLowerCase();
      return !sportsKeywords.some((k) => q.includes(k));
    });
  } catch {
    return [];
  }
}

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export interface MarketSuggestionFromAI {
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  category: string;
  suggestedDate: string; // ISO date
  probability: number;
}

export async function generateTurkeyMarketSuggestions(): Promise<MarketSuggestionFromAI[]> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: "user",
          content: `You are a prediction market analyst for Pusulam, a Turkish collective intelligence platform. Today is ${today}.

Search for the latest Turkish and global news, then suggest 5-8 prediction markets that would be interesting and resolvable within the next 1-14 days.

Rules:
- NO sports markets (no football, basketball, etc.)
- Categories must be one of: EKONOMI, SIYASET, TEKNOLOJI, GUNDEM, DUNYA, EGITIM
- Each market must have a clear, verifiable resolution criterion
- Focus on near-term events (1-14 days)
- Include Turkey-specific AND globally relevant topics
- Turkish titles should use simple language without special chars (no ş, ç, ğ, ı, ö, ü — use s, c, g, i, o, u)

Respond ONLY with a JSON array (no markdown, no explanation):
[
  {
    "titleTr": "...",
    "titleEn": "...",
    "descriptionTr": "... (resolution criteria in Turkish)",
    "descriptionEn": "... (resolution criteria in English)",
    "category": "EKONOMI|SIYASET|TEKNOLOJI|GUNDEM|DUNYA|EGITIM",
    "suggestedDate": "YYYY-MM-DD",
    "probability": 0.XX
  }
]`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const suggestions = JSON.parse(jsonMatch[0]) as MarketSuggestionFromAI[];
    return suggestions.filter(
      (s) =>
        s.titleTr &&
        s.category &&
        ["EKONOMI", "SIYASET", "TEKNOLOJI", "GUNDEM", "DUNYA", "EGITIM"].includes(s.category)
    );
  } catch (err) {
    console.error("News analysis failed:", err);
    return [];
  }
}

export async function translatePolymarketToTurkish(
  markets: { question: string; description: string; endDate: string; volume: number }[]
): Promise<MarketSuggestionFromAI[]> {
  if (markets.length === 0) return [];

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Translate and adapt these Polymarket prediction markets for a Turkish audience. Filter out any that are irrelevant to a Turkish audience or too niche.

Markets:
${markets.map((m, i) => `${i + 1}. "${m.question}" - ${m.description} (ends: ${m.endDate}, volume: $${m.volume})`).join("\n")}

Rules:
- Keep only globally interesting or Turkey-relevant markets
- Turkish titles: simple language, no special chars (use s,c,g,i,o,u not ş,ç,ğ,ı,ö,ü)
- Categories: EKONOMI, SIYASET, TEKNOLOJI, GUNDEM, DUNYA, EGITIM
- NO sports

Respond ONLY with a JSON array:
[
  {
    "titleTr": "...",
    "titleEn": "...",
    "descriptionTr": "...",
    "descriptionEn": "...",
    "category": "...",
    "suggestedDate": "YYYY-MM-DD",
    "probability": 0.XX
  }
]`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]) as MarketSuggestionFromAI[];
  } catch (err) {
    console.error("Polymarket translation failed:", err);
    return [];
  }
}

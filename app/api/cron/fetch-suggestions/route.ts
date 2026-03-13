import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchTrendingMarkets } from "@/lib/polymarket";
import { generateTurkeyMarketSuggestions, translatePolymarketToTurkish } from "@/lib/news-analyzer";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    authHeader === `Bearer ${process.env.INTERNAL_SECRET}`;

  if (process.env.CRON_SECRET && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { polymarket: 0, news: 0, errors: [] as string[] };

  // 1. Fetch from Polymarket
  try {
    const polyMarkets = await fetchTrendingMarkets(15);
    const translated = await translatePolymarketToTurkish(
      polyMarkets.map((m) => ({
        question: m.question,
        description: m.description,
        endDate: m.endDate,
        volume: m.volume,
      }))
    );

    for (const suggestion of translated) {
      try {
        await prisma.marketSuggestion.upsert({
          where: {
            source_sourceId: {
              source: "POLYMARKET",
              sourceId: suggestion.titleEn || suggestion.titleTr,
            },
          },
          update: {
            probability: suggestion.probability,
          },
          create: {
            source: "POLYMARKET",
            sourceId: suggestion.titleEn || suggestion.titleTr,
            titleTr: suggestion.titleTr,
            titleEn: suggestion.titleEn,
            descriptionTr: suggestion.descriptionTr,
            descriptionEn: suggestion.descriptionEn,
            category: suggestion.category,
            suggestedDate: new Date(suggestion.suggestedDate),
            probability: suggestion.probability,
          },
        });
        results.polymarket++;
      } catch {
        // Skip duplicates
      }
    }
  } catch (err) {
    results.errors.push(`Polymarket: ${err}`);
  }

  // 2. AI-generated Turkey suggestions
  try {
    const suggestions = await generateTurkeyMarketSuggestions();

    for (const suggestion of suggestions) {
      try {
        await prisma.marketSuggestion.upsert({
          where: {
            source_sourceId: {
              source: "NEWS_AI",
              sourceId: suggestion.titleTr,
            },
          },
          update: {
            probability: suggestion.probability,
          },
          create: {
            source: "NEWS_AI",
            sourceId: suggestion.titleTr,
            titleTr: suggestion.titleTr,
            titleEn: suggestion.titleEn,
            descriptionTr: suggestion.descriptionTr,
            descriptionEn: suggestion.descriptionEn,
            category: suggestion.category,
            suggestedDate: new Date(suggestion.suggestedDate),
            probability: suggestion.probability,
          },
        });
        results.news++;
      } catch {
        // Skip duplicates
      }
    }
  } catch (err) {
    results.errors.push(`News AI: ${err}`);
  }

  return NextResponse.json(results);
}

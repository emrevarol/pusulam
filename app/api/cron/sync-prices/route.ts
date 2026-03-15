import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";
import { fetchTrendingMarkets } from "@/lib/polymarket";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

/**
 * Match our markets to Polymarket markets using AI, then sync probabilities.
 * Runs every 6 hours via cron.
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  // Get our open markets
  const ourMarkets = await prisma.market.findMany({
    where: { status: "OPEN" },
    select: { id: true, title: true, description: true, yesPool: true, noPool: true },
  });

  if (ourMarkets.length === 0) {
    return NextResponse.json({ synced: 0, message: "No open markets" });
  }

  // Fetch Polymarket markets
  const polyMarkets = await fetchTrendingMarkets(50);
  if (polyMarkets.length === 0) {
    return NextResponse.json({ synced: 0, message: "Could not fetch Polymarket data" });
  }

  // Build Polymarket reference with probabilities
  const polyRef = polyMarkets.map((m) => {
    let yesProb = 0.5;
    try {
      const prices = JSON.parse(m.outcomePrices);
      yesProb = parseFloat(prices[0]) || 0.5;
    } catch {
      yesProb = 0.5;
    }
    return { question: m.question, probability: yesProb };
  });

  // Use AI to match our markets to Polymarket
  const ourList = ourMarkets.map((m, i) => `${i}. ${m.title}`).join("\n");
  const polyList = polyRef.map((m, i) => `${i}. [${(m.probability * 100).toFixed(0)}%] ${m.question}`).join("\n");

  let matches: Array<{ ourIndex: number; polyIndex: number; probability: number }> = [];

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Match prediction markets from List A to List B. Only match if they are about the SAME topic/event.

LIST A (our markets):
${ourList}

LIST B (Polymarket with current probabilities):
${polyList}

Return ONLY a JSON array of matches. Each match: {"a": index_from_A, "b": index_from_B, "prob": probability_from_B}
If no match found for a market, skip it. Example: [{"a":0,"b":3,"prob":0.65}]
Return [] if no matches.`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      matches = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("AI matching failed:", err);
    return NextResponse.json({ synced: 0, error: "AI matching failed" });
  }

  // Apply probability updates
  const results: Array<{ title: string; oldProb: number; newProb: number }> = [];

  for (const match of matches) {
    const market = ourMarkets[match.ourIndex];
    if (!market) continue;

    const newProb = Math.max(0.02, Math.min(0.98, match.probability));
    const currentProb = market.noPool / (market.yesPool + market.noPool);

    // Only update if difference is significant (>3%)
    if (Math.abs(newProb - currentProb) < 0.03) continue;

    // Calculate new pools that give desired probability while keeping k constant
    const totalLiquidity = market.yesPool + market.noPool;
    const newNoPool = newProb * totalLiquidity;
    const newYesPool = totalLiquidity - newNoPool;

    await prisma.$transaction([
      prisma.market.update({
        where: { id: market.id },
        data: { yesPool: newYesPool, noPool: newNoPool },
      }),
      prisma.priceHistory.create({
        data: {
          marketId: market.id,
          probability: newProb,
          source: "POLYMARKET",
        },
      }),
    ]);

    results.push({
      title: market.title,
      oldProb: Math.round(currentProb * 100),
      newProb: Math.round(newProb * 100),
    });
  }

  return NextResponse.json({
    synced: results.length,
    checked: ourMarkets.length,
    polymarketsAvailable: polyMarkets.length,
    aiMatches: matches.length,
    results,
  });
}

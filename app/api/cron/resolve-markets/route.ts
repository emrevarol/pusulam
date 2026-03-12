import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function resolveMarketWithAI(market: {
  id: string;
  title: string;
  description: string;
  resolutionDate: Date;
}): Promise<"YES" | "NO" | null> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
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
          content: `You are resolving a prediction market. Search the internet for current information and determine the outcome.

MARKET TITLE: ${market.title}
MARKET DESCRIPTION: ${market.description}
RESOLUTION DATE: ${market.resolutionDate.toISOString()}

Instructions:
1. Search the web for the latest information about this topic
2. Based on the evidence, determine if the answer is YES or NO
3. You MUST respond with ONLY one word: either "YES" or "NO"
4. If you truly cannot determine the outcome from available information, respond with "NO" (default to NO when uncertain)

Your answer (YES or NO):`,
        },
      ],
    });

    // Extract text blocks from response
    const text = response.content
      .filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      )
      .map((block) => block.text)
      .join(" ")
      .trim()
      .toUpperCase();

    if (text.includes("YES")) return "YES";
    if (text.includes("NO")) return "NO";
    return "NO"; // default
  } catch (err) {
    console.error(`AI resolution failed for market ${market.id}:`, err);
    return null;
  }
}

async function distributePayouts(marketId: string, outcome: "YES" | "NO") {
  const positions = await prisma.position.findMany({
    where: { marketId, shares: { gt: 0 } },
  });

  const buyTrades = await prisma.trade.findMany({
    where: { marketId, direction: "BUY" },
  });

  // Calculate weighted average weight per position
  const tradeWeights: Record<
    string,
    { totalShares: number; weightedSum: number }
  > = {};
  for (const trade of buyTrades) {
    const key = `${trade.userId}:${trade.side}`;
    if (!tradeWeights[key]) {
      tradeWeights[key] = { totalShares: 0, weightedSum: 0 };
    }
    tradeWeights[key].totalShares += trade.shares;
    tradeWeights[key].weightedSum += trade.shares * trade.weight;
  }

  const payoutOps = [];

  for (const pos of positions) {
    const isWinner = pos.side === outcome;

    if (isWinner && pos.shares > 0) {
      const costBasis = pos.shares * pos.avgPrice;
      const baseProfit = pos.shares - costBasis;
      const key = `${pos.userId}:${pos.side}`;
      const tw = tradeWeights[key];
      const avgWeight = tw ? tw.weightedSum / tw.totalShares : 1;
      const payout = costBasis + baseProfit * avgWeight;

      if (payout > 0) {
        payoutOps.push(
          prisma.user.update({
            where: { id: pos.userId },
            data: {
              balance: { increment: payout },
              reputation: { increment: Math.min(baseProfit * 0.1, 50) },
            },
          })
        );
      }
    } else if (!isWinner && pos.shares > 0) {
      const costBasis = pos.shares * pos.avgPrice;
      payoutOps.push(
        prisma.user.update({
          where: { id: pos.userId },
          data: {
            reputation: { decrement: Math.min(costBasis * 0.05, 25) },
          },
        })
      );
    }
  }

  // Score predictions
  const predictions = await prisma.prediction.findMany({
    where: { marketId },
  });
  const outcomeValue = outcome === "YES" ? 1 : 0;
  const predictionOps = predictions.map((pred) =>
    prisma.prediction.update({
      where: { id: pred.id },
      data: { score: Math.pow(pred.probability - outcomeValue, 2) },
    })
  );

  await prisma.$transaction([
    prisma.market.update({
      where: { id: marketId },
      data: {
        status: "RESOLVED",
        resolvedOutcome: outcome,
        resolvedAt: new Date(),
      },
    }),
    ...payoutOps,
    ...predictionOps,
  ]);
}

export async function GET(request: Request) {
  // Allow both cron secret and internal calls
  const authHeader = request.headers.get("authorization");
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    authHeader === `Bearer ${process.env.INTERNAL_SECRET}`;

  if (process.env.CRON_SECRET && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all CLOSED (not RESOLVED) markets
  const closedMarkets = await prisma.market.findMany({
    where: { status: "CLOSED" },
    select: {
      id: true,
      title: true,
      description: true,
      resolutionDate: true,
    },
  });

  if (closedMarkets.length === 0) {
    return NextResponse.json({ resolved: 0, message: "No markets to resolve" });
  }

  const results: { id: string; title: string; outcome: string | null }[] = [];

  for (const market of closedMarkets) {
    const outcome = await resolveMarketWithAI(market);
    if (outcome) {
      await distributePayouts(market.id, outcome);
      results.push({ id: market.id, title: market.title, outcome });
    } else {
      results.push({ id: market.id, title: market.title, outcome: "FAILED" });
    }
  }

  return NextResponse.json({
    resolved: results.filter((r) => r.outcome !== "FAILED").length,
    results,
  });
}

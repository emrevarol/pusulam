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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 2,
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

  // Calculate total cost and weighted average weight per user+side
  const tradeStats: Record<
    string,
    { totalCost: number; totalShares: number; weightedSum: number }
  > = {};
  for (const trade of buyTrades) {
    const key = `${trade.userId}:${trade.side}`;
    if (!tradeStats[key]) {
      tradeStats[key] = { totalCost: 0, totalShares: 0, weightedSum: 0 };
    }
    tradeStats[key].totalCost += trade.cost;
    tradeStats[key].totalShares += trade.shares;
    tradeStats[key].weightedSum += trade.shares * trade.weight;
  }

  const payoutOps = [];

  for (const pos of positions) {
    const isWinner = pos.side === outcome;
    const key = `${pos.userId}:${pos.side}`;
    const stats = tradeStats[key];

    if (isWinner && pos.shares > 0) {
      // Payout = total cost they paid + profit * weight
      // Each winning share resolves to 1 Pul
      // But in CPMM, cost can exceed shares (when price > 0.5)
      // So payout = what they paid back (cost) + net gain * weight
      const totalCost = stats?.totalCost ?? pos.shares * pos.avgPrice;
      const avgWeight = stats ? stats.weightedSum / stats.totalShares : 1;

      // Winning payout: they get their shares value (1 Pul each)
      // Plus bonus from weight on the profit portion
      const baseValue = pos.shares; // each winning share = 1 Pul
      const profit = baseValue - totalCost;

      let payout: number;
      if (profit > 0) {
        // They bought cheap, profit is positive
        payout = totalCost + profit * avgWeight;
      } else {
        // They bought expensive (price > 1 in CPMM), just return the share value
        payout = baseValue;
      }

      if (payout > 0) {
        payoutOps.push(
          prisma.user.update({
            where: { id: pos.userId },
            data: {
              balance: { increment: payout },
              reputation: { increment: Math.min(Math.max(profit, 0) * 0.1, 50) },
            },
          })
        );
      }
    } else if (!isWinner && pos.shares > 0) {
      // Losing side: cost already deducted, small reputation penalty
      const totalCost = stats?.totalCost ?? pos.shares * pos.avgPrice;
      payoutOps.push(
        prisma.user.update({
          where: { id: pos.userId },
          data: {
            reputation: { decrement: Math.min(totalCost * 0.05, 25) },
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

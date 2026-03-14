import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { notifyMarketResolved, notifyPayout } from "@/lib/notifications";

const anthropic = new Anthropic();

async function resolveMarketWithAI(market: {
  id: string;
  title: string;
  description: string;
  resolutionDate: Date;
}): Promise<"YES" | "NO" | null> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        },
      ],
      messages: [
        {
          role: "user",
          content: `You are resolving a prediction market. Today is ${today}. Search the internet for current, factual information and determine the outcome.

MARKET TITLE: ${market.title}
MARKET DESCRIPTION: ${market.description}
RESOLUTION DATE: ${market.resolutionDate.toISOString()}

Instructions:
1. Search the web for the latest FACTUAL information about this topic
2. For price/data markets (Bitcoin, USD/TRY, gold, etc.), find the actual price/value
3. For event markets (Oscar winners, elections, etc.), find if the event happened and the result
4. Based on VERIFIED evidence, determine if the answer is YES or NO
5. You MUST respond with ONLY one word: either "YES" or "NO"
6. If you truly cannot determine the outcome from available information, respond with "SKIP"

Your answer (YES, NO, or SKIP):`,
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

    if (text.includes("SKIP")) return null; // AI not confident, retry later
    if (text.includes("YES")) return "YES";
    if (text.includes("NO")) return "NO";
    return null; // couldn't determine, retry later
  } catch (err) {
    console.error(`AI resolution failed for market ${market.id}:`, err);
    return null;
  }
}

async function distributePayouts(marketId: string, outcome: "YES" | "NO", slug?: string) {
  const [positions, market] = await Promise.all([
    prisma.position.findMany({ where: { marketId, shares: { gt: 0 } } }),
    prisma.market.findUnique({ where: { id: marketId }, select: { title: true, slug: true } }),
  ]);

  const payoutOps = [];

  for (const pos of positions) {
    const isWinner = pos.side === outcome;

    if (isWinner && pos.shares > 0) {
      const payout = Math.floor(pos.shares); // each winning share = 1 oy hakki
      if (payout > 0) {
        payoutOps.push(
          prisma.user.update({
            where: { id: pos.userId },
            data: {
              oyHakki: { increment: payout },
              reputation: { increment: Math.min(payout * 0.1, 50) },
            },
          })
        );
      }
    } else if (!isWinner && pos.shares > 0) {
      payoutOps.push(
        prisma.user.update({
          where: { id: pos.userId },
          data: {
            reputation: { decrement: Math.min(pos.shares * 0.05, 25) },
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

  // Send notifications (async, non-blocking)
  const marketTitle = market?.title || "Piyasa";
  const marketSlug = market?.slug || slug || "";
  for (const pos of positions) {
    const isWinner = pos.side === outcome;
    if (isWinner && pos.shares > 0) {
      const payout = Math.floor(pos.shares);
      notifyPayout(pos.userId, marketTitle, payout, marketSlug).catch(() => {});
    } else {
      notifyMarketResolved(pos.userId, marketTitle, outcome, marketSlug).catch(() => {});
    }
  }
}

export async function GET(request: Request) {
  const { verifyCronAuth } = await import("@/lib/cron-auth");
  const authError = verifyCronAuth(request);
  if (authError) return authError;

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

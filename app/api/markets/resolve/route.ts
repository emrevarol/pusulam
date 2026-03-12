import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  // Admin-only
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { marketId, outcome } = await request.json();

  if (!marketId || !outcome || !["YES", "NO"].includes(outcome)) {
    return NextResponse.json({ error: "Gecersiz veri" }, { status: 400 });
  }

  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market) {
    return NextResponse.json({ error: "Piyasa bulunamadi" }, { status: 404 });
  }
  if (market.status === "RESOLVED") {
    return NextResponse.json({ error: "Piyasa zaten sonuclanmis" }, { status: 400 });
  }

  // Get all positions with shares > 0
  const positions = await prisma.position.findMany({
    where: { marketId, shares: { gt: 0 } },
  });

  // Get all BUY trades for this market to calculate weighted average weight per position
  const buyTrades = await prisma.trade.findMany({
    where: { marketId, direction: "BUY" },
  });

  // Group trades by userId+side to calculate weighted average weight
  const tradeWeights: Record<string, { totalShares: number; weightedSum: number }> = {};
  for (const trade of buyTrades) {
    const key = `${trade.userId}:${trade.side}`;
    if (!tradeWeights[key]) {
      tradeWeights[key] = { totalShares: 0, weightedSum: 0 };
    }
    tradeWeights[key].totalShares += trade.shares;
    tradeWeights[key].weightedSum += trade.shares * trade.weight;
  }

  // Build payout operations
  const payoutOps = [];
  const payoutDetails: { userId: string; payout: number; side: string }[] = [];

  for (const pos of positions) {
    const isWinner = pos.side === outcome;

    if (isWinner && pos.shares > 0) {
      // Each winning share is worth 1 Pul
      // Profit = shares - costBasis (costBasis = shares * avgPrice)
      const costBasis = pos.shares * pos.avgPrice;
      const baseProfit = pos.shares - costBasis;

      // Get weighted average weight for this position
      const key = `${pos.userId}:${pos.side}`;
      const tw = tradeWeights[key];
      const avgWeight = tw ? tw.weightedSum / tw.totalShares : 1;

      // Payout = costBasis + profit * avgWeight
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
        payoutDetails.push({ userId: pos.userId, payout, side: pos.side });
      }
    } else if (!isWinner && pos.shares > 0) {
      // Losing side: small reputation penalty
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

  // Score predictions (Brier score)
  const predictions = await prisma.prediction.findMany({
    where: { marketId },
  });

  const outcomeValue = outcome === "YES" ? 1 : 0;
  const predictionScoreOps = predictions.map((pred) => {
    // Brier score: lower is better, (prediction - outcome)^2
    const brierScore = Math.pow(pred.probability - outcomeValue, 2);
    return prisma.prediction.update({
      where: { id: pred.id },
      data: { score: brierScore },
    });
  });

  // Execute all in one transaction
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
    ...predictionScoreOps,
  ]);

  return NextResponse.json({
    success: true,
    outcome,
    payouts: payoutDetails.length,
    predictionsScored: predictions.length,
  });
}

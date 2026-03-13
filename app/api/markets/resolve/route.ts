import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
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

    // Build payout operations — winners get shares as oy hakki
    const payoutOps = [];
    const payoutDetails: { userId: string; payout: number; side: string }[] = [];

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
          payoutDetails.push({ userId: pos.userId, payout, side: pos.side });
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
          earlyResolution: market.status === "HALTED" || market.status === "OPEN",
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
  } catch (err) {
    console.error("Resolve error:", err);
    return NextResponse.json(
      { error: "Sonuclandirma sirasinda bir hata olustu." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateBuyCost, calculateSellReturn } from "@/lib/amm";
import {
  VALID_WEIGHTS,
  DAILY_FREE_PREDICTIONS,
  getCreditsRequired,
  getTodayIstanbul,
} from "@/lib/credits";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { marketId, side, shares, direction, weight = 1 } = await request.json();

  if (!marketId || !side || !shares || !direction) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  if (shares <= 0) {
    return NextResponse.json({ error: "Gecersiz miktar" }, { status: 400 });
  }

  if (!VALID_WEIGHTS.includes(weight)) {
    return NextResponse.json({ error: "Gecersiz agirlik" }, { status: 400 });
  }

  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market || market.status !== "OPEN") {
    return NextResponse.json(
      { error: "Piyasa bulunamadi veya kapali" },
      { status: 404 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
  }

  if (direction === "BUY") {
    const { cost, newYesPool, newNoPool, avgPrice } = calculateBuyCost(
      market.yesPool,
      market.noPool,
      side,
      shares
    );

    if (cost > user.balance) {
      return NextResponse.json({ error: "Yetersiz bakiye" }, { status: 400 });
    }

    // Check daily prediction limit and credits
    const today = getTodayIstanbul();
    const daily = await prisma.dailyPrediction.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });
    const usedToday = daily?.count ?? 0;
    const isFree = usedToday < DAILY_FREE_PREDICTIONS && weight === 1;
    const creditsNeeded = getCreditsRequired(weight, isFree);

    if (creditsNeeded > 0 && user.credits < creditsNeeded) {
      return NextResponse.json(
        { error: "Yetersiz kredi", creditsNeeded },
        { status: 400 }
      );
    }

    // Read existing position before transaction for weighted avg price calc
    const existingPos = await prisma.position.findUnique({
      where: {
        userId_marketId_side: {
          userId: user.id,
          marketId: market.id,
          side,
        },
      },
    });

    const positionOp = existingPos
      ? prisma.position.update({
          where: {
            userId_marketId_side: {
              userId: user.id,
              marketId: market.id,
              side,
            },
          },
          data: {
            shares: existingPos.shares + shares,
            avgPrice:
              (existingPos.shares * existingPos.avgPrice + shares * avgPrice) /
              (existingPos.shares + shares),
          },
        })
      : prisma.position.create({
          data: {
            userId: user.id,
            marketId: market.id,
            side,
            shares,
            avgPrice,
          },
        });

    const operations = [
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: user.balance - cost,
          ...(creditsNeeded > 0 ? { credits: { decrement: creditsNeeded } } : {}),
        },
      }),
      prisma.market.update({
        where: { id: market.id },
        data: {
          yesPool: newYesPool,
          noPool: newNoPool,
          volume: market.volume + cost,
          traderCount: { increment: 1 },
        },
      }),
      prisma.trade.create({
        data: {
          direction: "BUY",
          side,
          shares,
          price: avgPrice,
          cost,
          weight,
          userId: user.id,
          marketId: market.id,
        },
      }),
      positionOp,
      prisma.dailyPrediction.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        create: { userId: user.id, date: today, count: 1 },
        update: { count: { increment: 1 } },
      }),
    ];

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, cost, avgPrice, creditsUsed: creditsNeeded });
  }

  if (direction === "SELL") {
    const position = await prisma.position.findUnique({
      where: {
        userId_marketId_side: {
          userId: user.id,
          marketId: market.id,
          side,
        },
      },
    });

    if (!position || position.shares < shares) {
      return NextResponse.json({ error: "Yetersiz hisse" }, { status: 400 });
    }

    const { returnAmount, newYesPool, newNoPool } = calculateSellReturn(
      market.yesPool,
      market.noPool,
      side,
      shares
    );

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: user.balance + returnAmount },
      }),
      prisma.market.update({
        where: { id: market.id },
        data: {
          yesPool: newYesPool,
          noPool: newNoPool,
          volume: market.volume + returnAmount,
        },
      }),
      prisma.trade.create({
        data: {
          direction: "SELL",
          side,
          shares,
          price: returnAmount / shares,
          cost: returnAmount,
          weight: 1,
          userId: user.id,
          marketId: market.id,
        },
      }),
      prisma.position.update({
        where: {
          userId_marketId_side: {
            userId: user.id,
            marketId: market.id,
            side,
          },
        },
        data: { shares: position.shares - shares },
      }),
    ]);

    return NextResponse.json({ success: true, returnAmount });
  }

  return NextResponse.json({ error: "Gecersiz islem yonu" }, { status: 400 });
}

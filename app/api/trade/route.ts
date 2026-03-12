import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateBuyShares, calculateSellReturn } from "@/lib/amm";
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

  const { marketId, side, amount, shares, direction, weight = 1 } = await request.json();

  if (!marketId || !side || !direction) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  if (direction === "BUY" && (!amount || amount <= 0)) {
    return NextResponse.json({ error: "Gecersiz miktar" }, { status: 400 });
  }

  if (direction === "SELL" && (!shares || shares <= 0)) {
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
    const betAmount = amount;
    const { shares: sharesReceived, newYesPool, newNoPool, avgPrice } = calculateBuyShares(
      market.yesPool,
      market.noPool,
      side,
      betAmount
    );

    if (betAmount > user.balance) {
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
            shares: existingPos.shares + sharesReceived,
            avgPrice:
              (existingPos.shares * existingPos.avgPrice + sharesReceived * avgPrice) /
              (existingPos.shares + sharesReceived),
          },
        })
      : prisma.position.create({
          data: {
            userId: user.id,
            marketId: market.id,
            side,
            shares: sharesReceived,
            avgPrice,
          },
        });

    const operations = [
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: user.balance - betAmount,
          ...(creditsNeeded > 0 ? { credits: { decrement: creditsNeeded } } : {}),
        },
      }),
      prisma.market.update({
        where: { id: market.id },
        data: {
          yesPool: newYesPool,
          noPool: newNoPool,
          volume: market.volume + betAmount,
          traderCount: { increment: 1 },
        },
      }),
      prisma.trade.create({
        data: {
          direction: "BUY",
          side,
          shares: sharesReceived,
          price: avgPrice,
          cost: betAmount,
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

    return NextResponse.json({ success: true, cost: betAmount, shares: sharesReceived, avgPrice, creditsUsed: creditsNeeded });
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

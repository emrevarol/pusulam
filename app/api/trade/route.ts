import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateBuyShares, calculateSellReturn } from "@/lib/amm";
import { getTodayIstanbul } from "@/lib/credits";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { checkAndAwardBadges } from "@/lib/badges";
import { audit } from "@/lib/audit";
import { getTier } from "@/lib/tiers";

const REFERRAL_BONUS = 25;
const MAX_BET_AMOUNT = 10_000;

async function checkReferralReward(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true },
  });
  if (!user?.referredById) return;

  const existing = await prisma.referralReward.findUnique({
    where: { referredId: userId },
  });
  if (existing) return;

  const distinctDays = await prisma.dailyPrediction.count({
    where: { userId },
  });
  if (distinctDays < 3) return;

  await prisma.$transaction([
    prisma.referralReward.create({
      data: {
        referrerId: user.referredById,
        referredId: userId,
        amount: REFERRAL_BONUS,
      },
    }),
    prisma.user.update({
      where: { id: user.referredById },
      data: { oyHakki: { increment: REFERRAL_BONUS } },
    }),
  ]);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  // Rate limit: 60 trades per minute per user
  const rl = rateLimit(`trade:${session.user.id}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Çok fazla islem. Lütfen bekleyin." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const { marketId, side, amount, direction, shares: legacyShares } = body;

  // Support both new "amount" (oy hakki to spend) and legacy "shares" field
  const betAmount = amount || legacyShares;

  if (!marketId || !side || !betAmount || !direction) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  if (!["YES", "NO"].includes(side)) {
    return NextResponse.json({ error: "Geçersiz taraf" }, { status: 400 });
  }

  if (!["BUY", "SELL"].includes(direction)) {
    return NextResponse.json({ error: "Geçersiz işlem yönü" }, { status: 400 });
  }

  if (typeof betAmount !== "number" || betAmount <= 0 || betAmount > MAX_BET_AMOUNT) {
    return NextResponse.json(
      { error: `Miktar 1 ile ${MAX_BET_AMOUNT} arasında olmalıdır.` },
      { status: 400 }
    );
  }

  if (direction === "BUY") {
    const result = await prisma.$transaction(async (tx) => {
      // Lock market row
      const markets = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          status: string;
          yesPool: number;
          noPool: number;
          volume: number;
        }>
      >(
        `SELECT id, status, "yesPool", "noPool", volume FROM "Market" WHERE id = $1 FOR UPDATE`,
        marketId
      );

      const market = markets[0];
      if (!market || market.status !== "OPEN") {
        throw new Error("MARKET_NOT_FOUND");
      }

      // Check premium-only market access
      const marketFull = await tx.market.findUnique({
        where: { id: marketId },
        select: { premiumOnly: true },
      });
      if (marketFull?.premiumOnly) {
        const trader = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { plan: true, planExpiresAt: true },
        });
        const isExpired = trader?.planExpiresAt && trader.planExpiresAt < new Date();
        const traderPlan = (!isExpired && trader?.plan === "PREMIUM") ? "PREMIUM" : "FREE";
        if (traderPlan !== "PREMIUM") {
          throw new Error("PREMIUM_REQUIRED");
        }
      }

      // Lock user row and check balance
      const users = await tx.$queryRawUnsafe<
        Array<{ id: string; oyHakki: number }>
      >(
        `SELECT id, "oyHakki" FROM "User" WHERE id = $1 FOR UPDATE`,
        session.user.id
      );

      const user = users[0];
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.oyHakki < betAmount) throw new Error("INSUFFICIENT_BALANCE");

      // CPMM: spend betAmount oy hakki → receive shares
      const { shares, newYesPool, newNoPool, avgPrice } = calculateBuyShares(
        market.yesPool,
        market.noPool,
        side,
        betAmount
      );

      const today = getTodayIstanbul();

      // Update or create position
      const existingPos = await tx.position.findUnique({
        where: {
          userId_marketId_side: {
            userId: user.id,
            marketId: market.id,
            side,
          },
        },
      });

      const positionOp = existingPos
        ? tx.position.update({
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
        : tx.position.create({
            data: {
              userId: user.id,
              marketId: market.id,
              side,
              shares,
              avgPrice,
            },
          });

      await Promise.all([
        // Deduct the actual CPMM cost (betAmount oy hakki)
        tx.user.update({
          where: { id: user.id },
          data: { oyHakki: { decrement: betAmount } },
        }),
        tx.market.update({
          where: { id: market.id },
          data: {
            yesPool: newYesPool,
            noPool: newNoPool,
            volume: market.volume + betAmount,
            traderCount: { increment: 1 },
          },
        }),
        tx.trade.create({
          data: {
            direction: "BUY",
            side,
            shares,
            price: avgPrice,
            cost: betAmount,
            weight: 1,
            userId: user.id,
            marketId: market.id,
          },
        }),
        positionOp,
        tx.dailyPrediction.upsert({
          where: { userId_date: { userId: user.id, date: today } },
          create: { userId: user.id, date: today, count: 1 },
          update: { count: { increment: 1 } },
        }),
        // Record price history
        tx.priceHistory.create({
          data: {
            marketId: market.id,
            probability: newNoPool / (newYesPool + newNoPool),
            source: "TRADE",
          },
        }),
      ]);

      return { cost: betAmount, shares, avgPrice };
    });

    audit({ action: "TRADE_BUY", userId: session.user.id, details: { marketId, side, amount: betAmount, shares: result.shares } });

    await checkReferralReward(session.user.id).catch(() => {});
    await checkAndAwardBadges(session.user.id).catch(() => {});

    return NextResponse.json({ success: true, ...result });
  }

  if (direction === "SELL") {
    const result = await prisma.$transaction(async (tx) => {
      // Lock market row
      const markets = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          status: string;
          yesPool: number;
          noPool: number;
          volume: number;
        }>
      >(
        `SELECT id, status, "yesPool", "noPool", volume FROM "Market" WHERE id = $1 FOR UPDATE`,
        marketId
      );

      const market = markets[0];
      if (!market || market.status !== "OPEN") {
        throw new Error("MARKET_NOT_FOUND");
      }

      const position = await tx.position.findUnique({
        where: {
          userId_marketId_side: {
            userId: session.user.id,
            marketId: market.id,
            side,
          },
        },
      });

      if (!position || position.shares < betAmount) {
        throw new Error("INSUFFICIENT_SHARES");
      }

      const { returnAmount, newYesPool, newNoPool } = calculateSellReturn(
        market.yesPool,
        market.noPool,
        side,
        betAmount
      );

      await Promise.all([
        tx.user.update({
          where: { id: session.user.id },
          data: { oyHakki: { increment: returnAmount } },
        }),
        tx.market.update({
          where: { id: market.id },
          data: {
            yesPool: newYesPool,
            noPool: newNoPool,
            volume: market.volume + returnAmount,
          },
        }),
        tx.trade.create({
          data: {
            direction: "SELL",
            side,
            shares: betAmount,
            price: returnAmount / betAmount,
            cost: returnAmount,
            weight: 1,
            userId: session.user.id,
            marketId: market.id,
          },
        }),
        tx.position.update({
          where: {
            userId_marketId_side: {
              userId: session.user.id,
              marketId: market.id,
              side,
            },
          },
          data: { shares: position.shares - betAmount },
        }),
        tx.priceHistory.create({
          data: {
            marketId: market.id,
            probability: newNoPool / (newYesPool + newNoPool),
            source: "TRADE",
          },
        }),
      ]);

      return { returnAmount };
    });

    audit({ action: "TRADE_SELL", userId: session.user.id, details: { marketId, side, shares: betAmount } });

    return NextResponse.json({ success: true, ...result });
  }

  return NextResponse.json({ error: "Gecersiz islem yonu" }, { status: 400 });
}

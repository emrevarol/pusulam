import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateBuyCost, calculateSellReturn } from "@/lib/amm";
import { getTodayIstanbul } from "@/lib/credits";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { checkAndAwardBadges } from "@/lib/badges";

const REFERRAL_BONUS = 25;
const MAX_SHARES_PER_TRADE = 100_000;

async function checkReferralReward(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true },
  });
  if (!user?.referredById) return;

  // Already rewarded?
  const existing = await prisma.referralReward.findUnique({
    where: { referredId: userId },
  });
  if (existing) return;

  // Count distinct voting days
  const distinctDays = await prisma.dailyPrediction.count({
    where: { userId },
  });
  if (distinctDays < 3) return;

  // Award bonus to referrer
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

  const { marketId, side, shares, direction } = body;

  if (!marketId || !side || !shares || !direction) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  if (!["YES", "NO"].includes(side)) {
    return NextResponse.json({ error: "Geçersiz taraf" }, { status: 400 });
  }

  if (!["BUY", "SELL"].includes(direction)) {
    return NextResponse.json({ error: "Geçersiz işlem yönü" }, { status: 400 });
  }

  if (typeof shares !== "number" || shares <= 0 || shares > MAX_SHARES_PER_TRADE) {
    return NextResponse.json(
      { error: `Miktar 1 ile ${MAX_SHARES_PER_TRADE} arasında olmalıdır.` },
      { status: 400 }
    );
  }

  if (direction === "BUY") {
    // Use raw SQL with FOR UPDATE to prevent race conditions on pool state
    const result = await prisma.$transaction(async (tx) => {
      // Lock market row and get fresh state
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

      // Calculate with locked pool state
      const { cost, newYesPool, newNoPool, avgPrice } = calculateBuyCost(
        market.yesPool,
        market.noPool,
        side,
        shares
      );

      // Check user balance (also lock user row)
      const users = await tx.$queryRawUnsafe<
        Array<{ id: string; oyHakki: number }>
      >(
        `SELECT id, "oyHakki" FROM "User" WHERE id = $1 FOR UPDATE`,
        session.user.id
      );

      const user = users[0];
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.oyHakki < 1) throw new Error("INSUFFICIENT_BALANCE");

      const today = getTodayIstanbul();

      // Read existing position
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
        tx.user.update({
          where: { id: user.id },
          data: { oyHakki: { decrement: 1 } },
        }),
        tx.market.update({
          where: { id: market.id },
          data: {
            yesPool: newYesPool,
            noPool: newNoPool,
            volume: market.volume + cost,
            traderCount: { increment: 1 },
          },
        }),
        tx.trade.create({
          data: {
            direction: "BUY",
            side,
            shares,
            price: avgPrice,
            cost,
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
      ]);

      return { cost, shares, avgPrice };
    });

    // Check referral reward + badges (async, non-blocking)
    checkReferralReward(session.user.id).catch(() => {});
    checkAndAwardBadges(session.user.id).catch(() => {});

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

      if (!position || position.shares < shares) {
        throw new Error("INSUFFICIENT_SHARES");
      }

      const { returnAmount, newYesPool, newNoPool } = calculateSellReturn(
        market.yesPool,
        market.noPool,
        side,
        shares
      );

      await Promise.all([
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
            shares,
            price: returnAmount / shares,
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
          data: { shares: position.shares - shares },
        }),
      ]);

      return { returnAmount };
    });

    return NextResponse.json({ success: true, ...result });
  }

  return NextResponse.json({ error: "Gecersiz islem yonu" }, { status: 400 });
}

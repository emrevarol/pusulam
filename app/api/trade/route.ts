import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateBuyCost, calculateSellReturn } from "@/lib/amm";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { marketId, side, shares, direction } = await request.json();

  if (!marketId || !side || !shares || !direction) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  if (shares <= 0) {
    return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });
  }

  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market || market.status !== "OPEN") {
    return NextResponse.json({ error: "Piyasa bulunamadı veya kapalı" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
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

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: user.balance - cost },
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
          userId: user.id,
          marketId: market.id,
        },
      }),
      prisma.position.upsert({
        where: {
          userId_marketId_side: {
            userId: user.id,
            marketId: market.id,
            side,
          },
        },
        create: {
          userId: user.id,
          marketId: market.id,
          side,
          shares,
          avgPrice,
        },
        update: {
          shares: { increment: shares },
        },
      }),
    ]);

    return NextResponse.json({ success: true, cost, avgPrice });
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

  return NextResponse.json({ error: "Geçersiz işlem yönü" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getYesPrice } from "@/lib/amm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const positions = await prisma.position.findMany({
    where: { userId: session.user.id, shares: { gt: 0 } },
    include: {
      market: {
        select: {
          title: true,
          slug: true,
          status: true,
          yesPool: true,
          noPool: true,
          category: true,
          resolvedOutcome: true,
        },
      },
    },
  });

  const result = positions.map((p) => {
    const currentPrice =
      p.side === "YES"
        ? getYesPrice(p.market.yesPool, p.market.noPool)
        : 1 - getYesPrice(p.market.yesPool, p.market.noPool);
    const currentValue = p.shares * currentPrice;
    const costBasis = p.shares * p.avgPrice;
    const pnl = currentValue - costBasis;

    return {
      id: p.id,
      side: p.side,
      shares: p.shares,
      avgPrice: p.avgPrice,
      currentPrice,
      currentValue,
      pnl,
      market: p.market,
    };
  });

  return NextResponse.json(result);
}

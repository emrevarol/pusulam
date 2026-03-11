import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const trades = await prisma.trade.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      market: {
        select: { title: true, slug: true, category: true },
      },
    },
  });

  return NextResponse.json(
    trades.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }))
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId");

  if (!marketId) {
    return NextResponse.json({ error: "marketId required" }, { status: 400 });
  }

  const history = await prisma.priceHistory.findMany({
    where: { marketId },
    orderBy: { createdAt: "asc" },
    select: {
      probability: true,
      source: true,
      createdAt: true,
    },
  });

  return NextResponse.json(history);
}

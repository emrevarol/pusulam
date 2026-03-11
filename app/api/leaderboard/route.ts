import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { balance: "desc" },
    take: 50,
    select: {
      id: true,
      displayName: true,
      username: true,
      balance: true,
      reputation: true,
      _count: { select: { trades: true } },
    },
  });

  return NextResponse.json(
    users.map((u, i) => ({
      rank: i + 1,
      ...u,
    }))
  );
}

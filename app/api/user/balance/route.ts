import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DAILY_FREE_OY_HAKKI, getTodayIstanbul } from "@/lib/credits";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { oyHakki: true },
  });

  const today = getTodayIstanbul();
  const daily = await prisma.dailyPrediction.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  const usedToday = daily?.count ?? 0;
  const dailyFreeRemaining = Math.max(0, DAILY_FREE_OY_HAKKI - usedToday);

  return NextResponse.json({
    oyHakki: user?.oyHakki ?? 0,
    dailyFreeRemaining,
  });
}

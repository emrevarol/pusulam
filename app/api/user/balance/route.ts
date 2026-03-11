import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DAILY_FREE_PREDICTIONS, getTodayIstanbul } from "@/lib/credits";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true, credits: true },
  });

  const today = getTodayIstanbul();
  const daily = await prisma.dailyPrediction.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  const usedToday = daily?.count ?? 0;
  const dailyPredictionsRemaining = Math.max(0, DAILY_FREE_PREDICTIONS - usedToday);

  return NextResponse.json({
    balance: user?.balance ?? 0,
    credits: user?.credits ?? 0,
    dailyPredictionsRemaining,
  });
}

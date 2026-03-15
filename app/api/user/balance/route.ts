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

  const [user, daily] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        oyHakki: true,
        streak: true,
        reputation: true,
        bio: true,
        avatar: true,
        displayName: true,
        plan: true,
        planExpiresAt: true,
        streakFreezes: true,
        badges: {
          include: {
            badge: {
              select: { name: true, icon: true, tier: true, description: true },
            },
          },
          orderBy: { earnedAt: "desc" },
        },
      },
    }),
    prisma.dailyPrediction.findUnique({
      where: { userId_date: { userId: session.user.id, date: getTodayIstanbul() } },
    }),
  ]);

  const usedToday = daily?.count ?? 0;
  const dailyFreeRemaining = Math.max(0, DAILY_FREE_OY_HAKKI - usedToday);

  const isExpired = user?.planExpiresAt && user.planExpiresAt < new Date();
  const activePlan = (!isExpired && user?.plan === "PREMIUM") ? "PREMIUM" : "FREE";

  return NextResponse.json({
    oyHakki: user?.oyHakki ?? 0,
    streak: user?.streak ?? 0,
    reputation: user?.reputation ?? 0,
    bio: user?.bio ?? null,
    avatar: user?.avatar ?? null,
    displayName: user?.displayName ?? "",
    plan: activePlan,
    planExpiresAt: user?.planExpiresAt ?? null,
    streakFreezes: user?.streakFreezes ?? 0,
    badges: user?.badges ?? [],
    dailyFreeRemaining,
  });
}

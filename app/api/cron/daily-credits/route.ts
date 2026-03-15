import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";
import { TIERS } from "@/lib/tiers";

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  // Free users get free tier daily amount
  const freeResult = await prisma.user.updateMany({
    where: { NOT: { plan: "PREMIUM" } },
    data: { oyHakki: { increment: TIERS.FREE.dailyOyHakki } },
  });

  // Premium users get premium tier daily amount
  const premiumResult = await prisma.user.updateMany({
    where: { plan: "PREMIUM", planExpiresAt: { gt: new Date() } },
    data: { oyHakki: { increment: TIERS.PREMIUM.dailyOyHakki } },
  });

  // Reset monthly streak freezes on 1st of month
  const today = new Date();
  if (today.getDate() === 1) {
    await prisma.user.updateMany({
      where: { plan: "PREMIUM" },
      data: { streakFreezes: TIERS.PREMIUM.streakFreezesPerMonth },
    });
  }

  return NextResponse.json({
    free: { count: freeResult.count, amount: TIERS.FREE.dailyOyHakki },
    premium: { count: premiumResult.count, amount: TIERS.PREMIUM.dailyOyHakki },
    timestamp: new Date().toISOString(),
  });
}

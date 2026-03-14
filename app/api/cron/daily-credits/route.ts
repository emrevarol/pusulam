import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DAILY_FREE_OY_HAKKI } from "@/lib/credits";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  // Add daily free oy hakki to all users
  const result = await prisma.user.updateMany({
    data: { oyHakki: { increment: DAILY_FREE_OY_HAKKI } },
  });

  return NextResponse.json({
    updated: result.count,
    amount: DAILY_FREE_OY_HAKKI,
    timestamp: new Date().toISOString(),
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  // Close all OPEN markets whose resolutionDate has passed
  const result = await prisma.market.updateMany({
    where: {
      status: "OPEN",
      resolutionDate: { lte: new Date() },
    },
    data: { status: "CLOSED" },
  });

  return NextResponse.json({
    closed: result.count,
    timestamp: new Date().toISOString(),
  });
}

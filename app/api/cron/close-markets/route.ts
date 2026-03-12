import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

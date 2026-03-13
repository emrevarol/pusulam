import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { marketId, reason } = await request.json();
  if (!marketId || !reason) {
    return NextResponse.json({ error: "Gecersiz veri" }, { status: 400 });
  }

  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market) {
    return NextResponse.json({ error: "Piyasa bulunamadi" }, { status: 404 });
  }
  if (market.status !== "OPEN") {
    return NextResponse.json({ error: "Sadece acik piyasalar durdurulabilir" }, { status: 400 });
  }

  await prisma.market.update({
    where: { id: marketId },
    data: {
      status: "HALTED",
      haltedAt: new Date(),
      haltReason: reason,
    },
  });

  return NextResponse.json({ success: true });
}

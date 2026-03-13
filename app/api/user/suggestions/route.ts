import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const suggestions = await prisma.marketSuggestion.findMany({
    where: { suggestedById: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      titleTr: true,
      category: true,
      suggestedDate: true,
      status: true,
      rejectReason: true,
      createdAt: true,
    },
  });

  return NextResponse.json(suggestions);
}

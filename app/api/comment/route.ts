import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { marketId, content } = await request.json();

  if (!marketId || !content?.trim()) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      userId: session.user.id,
      marketId,
    },
  });

  return NextResponse.json(comment, { status: 201 });
}

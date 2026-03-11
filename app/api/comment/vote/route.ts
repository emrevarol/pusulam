import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { commentId, value } = await request.json();

  if (!commentId || ![1, -1].includes(value)) {
    return NextResponse.json({ error: "Gecersiz oy" }, { status: 400 });
  }

  const existing = await prisma.commentVote.findUnique({
    where: { userId_commentId: { userId: session.user.id, commentId } },
  });

  if (existing) {
    if (existing.value === value) {
      // Same vote — remove it (toggle off)
      await prisma.commentVote.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed" });
    }
    // Different vote — update
    await prisma.commentVote.update({
      where: { id: existing.id },
      data: { value },
    });
    return NextResponse.json({ action: "updated" });
  }

  // New vote
  await prisma.commentVote.create({
    data: { userId: session.user.id, commentId, value },
  });
  return NextResponse.json({ action: "created" });
}

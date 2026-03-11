import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - list user's conversations
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { take: 1, orderBy: { createdAt: "desc" } },
      market: { select: { title: true, slug: true } },
    },
  });

  return NextResponse.json(conversations);
}

// POST - create new conversation
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { marketId, title } = await request.json();

  const conversation = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      marketId: marketId || null,
      title: title || null,
    },
  });

  return NextResponse.json(conversation);
}

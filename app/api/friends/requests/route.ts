import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyFriendRequest } from "@/lib/notifications";

// GET: List pending friend requests received
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const requests = await prisma.friendship.findMany({
    where: {
      receiverId: session.user.id,
      status: "PENDING",
    },
    include: {
      requester: {
        select: { id: true, displayName: true, username: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

// POST: Send a friend request
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { receiverId } = await request.json();

  if (!receiverId || receiverId === session.user.id) {
    return NextResponse.json({ error: "Gecersiz istek" }, { status: 400 });
  }

  // Check if friendship already exists in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, receiverId },
        { requesterId: receiverId, receiverId: session.user.id },
      ],
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Zaten istek gonderilmis veya arkadassiniz" },
      { status: 409 }
    );
  }

  const [friendship, sender] = await Promise.all([
    prisma.friendship.create({
      data: {
        requesterId: session.user.id,
        receiverId,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { displayName: true },
    }),
  ]);

  // Notify receiver (async, non-blocking)
  notifyFriendRequest(receiverId, sender?.displayName || "Birisi").catch(() => {});

  return NextResponse.json(friendship, { status: 201 });
}

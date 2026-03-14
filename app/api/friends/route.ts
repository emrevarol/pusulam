import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: session.user.id },
        { receiverId: session.user.id },
      ],
    },
    include: {
      requester: {
        select: { id: true, displayName: true, username: true, oyHakki: true, reputation: true, _count: { select: { trades: true } } },
      },
      receiver: {
        select: { id: true, displayName: true, username: true, oyHakki: true, reputation: true, _count: { select: { trades: true } } },
      },
    },
  });

  const friends = friendships.map((f) => {
    const friend =
      f.requesterId === session.user.id ? f.receiver : f.requester;
    return { ...friend, friendshipId: f.id };
  });

  return NextResponse.json(friends);
}

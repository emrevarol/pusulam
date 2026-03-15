import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      displayName: true,
      username: true,
      bio: true,
      reputation: true,
      oyHakki: true,
      streak: true,
      plan: true,
      createdAt: true,
      _count: { select: { trades: true, comments: true } },
      badges: {
        include: {
          badge: {
            select: { name: true, icon: true, tier: true, description: true },
          },
        },
        orderBy: { earnedAt: "desc" },
      },
      positions: {
        where: { shares: { gt: 0 } },
        select: {
          side: true,
          shares: true,
          market: {
            select: { title: true, slug: true, category: true, status: true },
          },
        },
        take: 20,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
  }

  // Check friendship status with current user
  let friendshipStatus: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "FRIENDS" | "SELF" = "NONE";

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    if (session.user.id === user.id) {
      friendshipStatus = "SELF";
    } else {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: session.user.id, receiverId: user.id },
            { requesterId: user.id, receiverId: session.user.id },
          ],
        },
      });

      if (friendship) {
        if (friendship.status === "ACCEPTED") {
          friendshipStatus = "FRIENDS";
        } else if (friendship.status === "PENDING") {
          friendshipStatus =
            friendship.requesterId === session.user.id
              ? "PENDING_SENT"
              : "PENDING_RECEIVED";
        }
      }
    }
  }

  return NextResponse.json({ ...user, friendshipStatus });
}

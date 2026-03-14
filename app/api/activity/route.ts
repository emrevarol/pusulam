import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET: Activity feed — recent trades from friends + global highlights
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const feed = searchParams.get("feed") || "friends"; // friends | global
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 50);
  const cursor = searchParams.get("cursor"); // for pagination

  let userIds: string[] = [];

  if (feed === "friends") {
    // Get friend IDs
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: session.user.id }, { receiverId: session.user.id }],
      },
      select: { requesterId: true, receiverId: true },
    });

    userIds = friendships.map((f) =>
      f.requesterId === session.user.id ? f.receiverId : f.requesterId
    );

    // Include self in feed
    userIds.push(session.user.id);
  }

  const whereClause = {
    ...(feed === "friends" && userIds.length > 0
      ? { userId: { in: userIds } }
      : {}),
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
  };

  const trades = await prisma.trade.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, displayName: true, username: true } },
      market: { select: { id: true, title: true, slug: true, category: true, yesPool: true, noPool: true } },
    },
  });

  // Also get recent comments for richer feed
  const comments = await prisma.comment.findMany({
    where: {
      ...(feed === "friends" && userIds.length > 0
        ? { userId: { in: userIds } }
        : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.floor(limit / 3),
    include: {
      user: { select: { id: true, displayName: true, username: true } },
      market: { select: { id: true, title: true, slug: true, category: true } },
    },
  });

  // Merge and sort by date
  const activities = [
    ...trades.map((t) => ({
      type: "trade" as const,
      id: t.id,
      user: t.user,
      market: t.market,
      data: { direction: t.direction, side: t.side, shares: t.shares, price: t.price },
      createdAt: t.createdAt,
    })),
    ...comments.map((c) => ({
      type: "comment" as const,
      id: c.id,
      user: c.user,
      market: c.market,
      data: { content: c.content.slice(0, 120) },
      createdAt: c.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
   .slice(0, limit);

  const nextCursor = activities.length > 0
    ? activities[activities.length - 1].createdAt.toISOString()
    : null;

  return NextResponse.json({ activities, nextCursor });
}

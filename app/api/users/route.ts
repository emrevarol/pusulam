import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = 20;

  const where = q
    ? {
        OR: [
          { displayName: { contains: q, mode: "insensitive" as const } },
          { username: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { oyHakki: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        displayName: true,
        username: true,
        reputation: true,
        oyHakki: true,
        _count: { select: { trades: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Get friendship status for each user if logged in
  let friendshipMap: Record<string, string> = {};
  if (session?.user?.id) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: session.user.id },
          { receiverId: session.user.id },
        ],
      },
    });

    for (const f of friendships) {
      const otherId =
        f.requesterId === session.user.id ? f.receiverId : f.requesterId;
      if (f.status === "ACCEPTED") {
        friendshipMap[otherId] = "FRIENDS";
      } else if (f.status === "PENDING") {
        friendshipMap[otherId] =
          f.requesterId === session.user.id
            ? "PENDING_SENT"
            : "PENDING_RECEIVED";
      }
    }
  }

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      friendshipStatus:
        u.id === session?.user?.id
          ? "SELF"
          : friendshipMap[u.id] || "NONE",
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

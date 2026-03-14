import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "global";

  let whereFilter = {};

  if (type === "friends") {
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
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === session.user.id ? f.receiverId : f.requesterId
    );
    friendIds.push(session.user.id); // include self

    whereFilter = { id: { in: friendIds } };
  }

  const users = await prisma.user.findMany({
    where: whereFilter,
    orderBy: { oyHakki: "desc" },
    take: 50,
    select: {
      id: true,
      displayName: true,
      username: true,
      oyHakki: true,
      reputation: true,
      _count: { select: { trades: true } },
    },
  });

  return NextResponse.json(
    users.map((u, i) => ({
      rank: i + 1,
      ...u,
    }))
  );
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { friendId } = await request.json();

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: session.user.id, receiverId: friendId },
        { requesterId: friendId, receiverId: session.user.id },
      ],
    },
  });

  if (!friendship) {
    return NextResponse.json({ error: "Arkadaslik bulunamadi" }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id: friendship.id } });

  return NextResponse.json({ success: true });
}

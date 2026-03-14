import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyFriendAccepted } from "@/lib/notifications";
import { checkAndAwardBadges } from "@/lib/badges";

// PATCH: Accept or reject a friend request
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await request.json();

  if (!["ACCEPT", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Gecersiz aksiyon" }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({ where: { id } });

  if (!friendship || friendship.receiverId !== session.user.id) {
    return NextResponse.json({ error: "Istek bulunamadi" }, { status: 404 });
  }

  if (friendship.status !== "PENDING") {
    return NextResponse.json({ error: "Istek zaten cevaplanmis" }, { status: 400 });
  }

  const updated = await prisma.friendship.update({
    where: { id },
    data: { status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" },
  });

  if (action === "ACCEPT") {
    // Notify requester
    const accepter = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { displayName: true },
    });
    notifyFriendAccepted(
      friendship.requesterId,
      accepter?.displayName || "Birisi"
    ).catch(() => {});

    // Check badges for both users (social badges)
    checkAndAwardBadges(session.user.id).catch(() => {});
    checkAndAwardBadges(friendship.requesterId).catch(() => {});
  }

  return NextResponse.json(updated);
}

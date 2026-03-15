import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sanitizeText, validateLength } from "@/lib/validation";

// GET: Fetch own profile data
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      displayName: true,
      username: true,
      email: true,
      bio: true,
      avatar: true,
    },
  });

  return NextResponse.json(user);
}

// PATCH: Update profile (bio, displayName, avatar)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const { displayName, bio, avatar } = body;
  const updateData: Record<string, string | null> = {};

  // Validate displayName
  if (displayName !== undefined) {
    if (!displayName || typeof displayName !== "string") {
      return NextResponse.json({ error: "Görünen ad boş olamaz" }, { status: 400 });
    }
    const nameErr = validateLength(sanitizeText(displayName), "Görünen ad", 2, 64);
    if (nameErr) {
      return NextResponse.json({ error: nameErr }, { status: 400 });
    }
    updateData.displayName = sanitizeText(displayName);
  }

  // Validate bio
  if (bio !== undefined) {
    if (bio === null || bio === "") {
      updateData.bio = null;
    } else if (typeof bio === "string") {
      const bioErr = validateLength(bio, "Bio", 0, 300);
      if (bioErr) {
        return NextResponse.json({ error: bioErr }, { status: 400 });
      }
      updateData.bio = sanitizeText(bio);
    }
  }

  // Validate avatar URL
  if (avatar !== undefined) {
    if (avatar === null || avatar === "") {
      updateData.avatar = null;
    } else if (typeof avatar === "string") {
      if (avatar.length > 500) {
        return NextResponse.json({ error: "Avatar URL çok uzun" }, { status: 400 });
      }
      // Basic URL validation
      if (!avatar.startsWith("http://") && !avatar.startsWith("https://")) {
        return NextResponse.json({ error: "Geçerli bir URL girin" }, { status: 400 });
      }
      updateData.avatar = avatar;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, displayName: true, bio: true, avatar: true },
  });

  return NextResponse.json(updated);
}

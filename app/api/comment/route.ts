import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeText, validateLength } from "@/lib/validation";
import { checkAndAwardBadges } from "@/lib/badges";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  // Rate limit: 30 comments per minute per user
  const rl = rateLimit(`comment:${session.user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Çok fazla yorum. Lütfen bekleyin." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const { marketId, content } = body;

  if (!marketId || !content?.trim()) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  // Sanitize and validate content length
  const sanitized = sanitizeText(content);
  const lengthErr = validateLength(sanitized, "Yorum", 1, 2000);
  if (lengthErr) {
    return NextResponse.json({ error: lengthErr }, { status: 400 });
  }

  // Verify market exists
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { id: true },
  });
  if (!market) {
    return NextResponse.json({ error: "Piyasa bulunamadı" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      content: sanitized,
      userId: session.user.id,
      marketId,
    },
  });

  // Check badges (async, non-blocking)
  checkAndAwardBadges(session.user.id).catch(() => {});

  return NextResponse.json(comment, { status: 201 });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/helpers";
import {
  isValidCategory,
  sanitizeText,
  validateLength,
  validateResolutionDate,
} from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const where = category ? { category, status: "OPEN" } : { status: "OPEN" };

  const markets = await prisma.market.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { displayName: true } },
      _count: { select: { trades: true } },
    },
  });

  return NextResponse.json(markets);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    // Only admins can create markets directly
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const { title, description, category, resolutionDate } = body;

    if (!title || !description || !category || !resolutionDate) {
      return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
    }

    // Validate title
    const sanitizedTitle = sanitizeText(title);
    const titleErr = validateLength(sanitizedTitle, "Başlık", 5, 256);
    if (titleErr) {
      return NextResponse.json({ error: titleErr }, { status: 400 });
    }

    // Validate description
    const sanitizedDesc = sanitizeText(description);
    const descErr = validateLength(sanitizedDesc, "Açıklama", 10, 2000);
    if (descErr) {
      return NextResponse.json({ error: descErr }, { status: 400 });
    }

    // Validate category
    if (!isValidCategory(category)) {
      return NextResponse.json({ error: "Geçersiz kategori" }, { status: 400 });
    }

    // Validate resolution date
    const dateErr = validateResolutionDate(resolutionDate);
    if (dateErr) {
      return NextResponse.json({ error: dateErr }, { status: 400 });
    }

    const slug = slugify(sanitizedTitle);

    const existing = await prisma.market.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "Bu baslikta bir piyasa zaten var." },
        { status: 409 }
      );
    }

    const market = await prisma.market.create({
      data: {
        title: sanitizedTitle,
        description: sanitizedDesc,
        category,
        slug,
        resolutionDate: new Date(resolutionDate),
        createdById: session.user.id,
      },
    });

    return NextResponse.json(market, { status: 201 });
  } catch (err) {
    console.error("Create market error:", err);
    return NextResponse.json(
      { error: "Piyasa olusturulurken bir hata olustu." },
      { status: 500 }
    );
  }
}

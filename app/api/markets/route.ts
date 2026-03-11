import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/helpers";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { title, description, category, resolutionDate } =
    await request.json();

  if (!title || !description || !category || !resolutionDate) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const slug = slugify(title);

  const existing = await prisma.market.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "Bu başlıkta bir piyasa zaten var." },
      { status: 409 }
    );
  }

  const market = await prisma.market.create({
    data: {
      title,
      description,
      category,
      slug,
      resolutionDate: new Date(resolutionDate),
      createdById: session.user.id,
    },
  });

  return NextResponse.json(market, { status: 201 });
}

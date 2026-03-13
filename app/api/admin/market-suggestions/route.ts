import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// GET: List suggestions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const suggestions = await prisma.marketSuggestion.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json(suggestions);
}

// POST: Approve or reject a suggestion
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { suggestionId, action, edits } = await request.json();

  if (!suggestionId || !["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Gecersiz veri" }, { status: 400 });
  }

  const suggestion = await prisma.marketSuggestion.findUnique({
    where: { id: suggestionId },
  });

  if (!suggestion || suggestion.status !== "PENDING") {
    return NextResponse.json({ error: "Oneri bulunamadi veya zaten islendi" }, { status: 404 });
  }

  if (action === "REJECT") {
    await prisma.marketSuggestion.update({
      where: { id: suggestionId },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: user.id },
    });
    return NextResponse.json({ success: true, action: "REJECTED" });
  }

  // APPROVE: create market
  const title = edits?.title || suggestion.titleTr;
  const description = edits?.description || suggestion.descriptionTr;
  const category = edits?.category || suggestion.category;
  const resolutionDate = edits?.resolutionDate
    ? new Date(edits.resolutionDate)
    : suggestion.suggestedDate;

  const slug = slugify(title) + "-" + Date.now().toString(36);

  // Set initial pools based on probability
  const prob = suggestion.probability || 0.5;
  const liquidity = 5000;
  const yesPool = Math.round(liquidity * (1 - prob));
  const noPool = Math.round(liquidity * prob);

  await prisma.$transaction([
    prisma.market.create({
      data: {
        title,
        description,
        titleTranslations: suggestion.titleEn ? { en: suggestion.titleEn } : undefined,
        descriptionTranslations: suggestion.descriptionEn
          ? { en: suggestion.descriptionEn }
          : undefined,
        category,
        slug,
        resolutionDate,
        yesPool,
        noPool,
        createdById: user.id,
      },
    }),
    prisma.marketSuggestion.update({
      where: { id: suggestionId },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: user.id },
    }),
  ]);

  return NextResponse.json({ success: true, action: "APPROVED", slug });
}

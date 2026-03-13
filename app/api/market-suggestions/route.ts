import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { title, description, category, resolutionDate } =
      await request.json();

    if (!title || !description || !category || !resolutionDate) {
      return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
    }

    await prisma.marketSuggestion.create({
      data: {
        source: "USER",
        titleTr: title,
        descriptionTr: description,
        category,
        suggestedDate: new Date(resolutionDate),
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Market suggestion error:", err);
    return NextResponse.json(
      { error: "Oneri gonderilirken bir hata olustu." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { message, history } = await request.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Mesaj bos" }, { status: 400 });
  }

  // Get active markets for context
  const markets = await prisma.market.findMany({
    where: { status: "OPEN" },
    orderBy: { volume: "desc" },
    take: 20,
    select: {
      title: true,
      slug: true,
      category: true,
      yesPool: true,
      noPool: true,
      volume: true,
      traderCount: true,
      resolutionDate: true,
    },
  });

  const marketContext = markets
    .map((m) => {
      const yesPct = ((m.noPool / (m.yesPool + m.noPool)) * 100).toFixed(0);
      return `- ${m.title} | %${yesPct} Evet | Hacim: ${m.volume} K | ${m.traderCount} tahminci | Bitis: ${m.resolutionDate.toISOString().split("T")[0]}`;
    })
    .join("\n");

  const systemPrompt = `Sen Pusulam AI Asistani'sin. Pusulam, Turkiye'nin kolektif zeka platformudur. Kullanicilar gercek dunya olaylarina tahminler yapar.

ONEMLI KURALLAR:
- Sen bir TAHMIN ANALIZ asistanisin, bahis danismani DEGILSIN
- "Bahis", "kumar", "sans", "oran" kelimelerini ASLA kullanma
- Bunun yerine "tahmin", "olasilik", "analiz", "ongorü" kullan
- Turkce konusuyorsun, nazik ve bilgilendirici ol
- Kullaniciya piyasalar hakkinda bilgi ver, analiz yap, farkli bakis acilari sun
- Kesin tahmin verme, olasılıkları ve farkli senaryolari tartis
- Kaynak goster: TCMB, TUIK, Reuters, Bloomberg, Polymarket gibi

AKTIF PIYASALAR:
${marketContext}

Kullanicinin sorusuna bu piyasalar baglaminda cevap ver. Eger spesifik bir piyasa hakkinda soruyorsa, o piyasanin detaylarini kullan.`;

  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...(history || []).map((h: { role: string; content: string }) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ response: text });
}

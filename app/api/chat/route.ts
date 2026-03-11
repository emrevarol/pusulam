import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, history, locale } = await request.json();
  const isTr = locale !== "en";

  if (!message?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
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
      return isTr
        ? `- ${m.title} | %${yesPct} Evet | Hacim: ${m.volume} K | ${m.traderCount} tahminci | Bitis: ${m.resolutionDate.toISOString().split("T")[0]}`
        : `- ${m.title} | ${yesPct}% Yes | Volume: ${m.volume} K | ${m.traderCount} forecasters | Ends: ${m.resolutionDate.toISOString().split("T")[0]}`;
    })
    .join("\n");

  const systemPrompt = isTr
    ? `Sen Pusulam AI Asistani'sin. Pusulam, Turkiye'nin kolektif zeka platformudur. Kullanicilar gercek dunya olaylarina tahminler yapar.

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

Kullanicinin sorusuna bu piyasalar baglaminda cevap ver. Eger spesifik bir piyasa hakkinda soruyorsa, o piyasanin detaylarini kullan.`
    : `You are the Pusulam AI Assistant. Pusulam is Turkey's collective intelligence platform. Users make predictions on real-world events.

IMPORTANT RULES:
- You are a PREDICTION ANALYSIS assistant, NOT a betting advisor
- NEVER use words: betting, gambling, luck, odds
- Instead use: prediction, probability, analysis, forecast
- Respond in English, be polite and informative
- Provide information about markets, analyze, offer different perspectives
- Never give definitive predictions — discuss probabilities and different scenarios
- Cite sources: TCMB, TUIK, Reuters, Bloomberg, Polymarket, etc.

ACTIVE MARKETS:
${marketContext}

Answer the user's question in the context of these markets. If they ask about a specific market, use that market's details.`;

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

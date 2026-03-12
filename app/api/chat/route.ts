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

  const { message, history, locale, conversationId, marketId } =
    await request.json();
  const isTr = locale !== "en";

  if (!message?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  // Resolve or create conversation
  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
  } else {
    conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        marketId: marketId || null,
        title: message.slice(0, 50),
      },
      include: { messages: true },
    });
  }

  // Get active markets for context
  const markets = await prisma.market.findMany({
    where: { status: "OPEN" },
    orderBy: { volume: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      yesPool: true,
      noPool: true,
      volume: true,
      traderCount: true,
      resolutionDate: true,
      description: true,
    },
  });

  // If marketId provided, get specific market details for richer context
  let specificMarketContext = "";
  const targetMarketId = marketId || conversation.marketId;
  if (targetMarketId) {
    const specificMarket = markets.find((m) => m.id === targetMarketId);
    if (specificMarket) {
      specificMarketContext = isTr
        ? `\n\nKULLANICI BU PIYASA HAKKINDA KONUSUYOR:\nBaslik: ${specificMarket.title}\nAciklama: ${specificMarket.description}\nKategori: ${specificMarket.category}\nEvet Olasiligi: %${((specificMarket.noPool / (specificMarket.yesPool + specificMarket.noPool)) * 100).toFixed(0)}\nHacim: ${specificMarket.volume} P\nTahminci: ${specificMarket.traderCount}\nBitis: ${specificMarket.resolutionDate.toISOString().split("T")[0]}`
        : `\n\nUSER IS DISCUSSING THIS MARKET:\nTitle: ${specificMarket.title}\nDescription: ${specificMarket.description}\nCategory: ${specificMarket.category}\nYes Probability: ${((specificMarket.noPool / (specificMarket.yesPool + specificMarket.noPool)) * 100).toFixed(0)}%\nVolume: ${specificMarket.volume} P\nForecasters: ${specificMarket.traderCount}\nEnds: ${specificMarket.resolutionDate.toISOString().split("T")[0]}`;
    }
  }

  const marketContext = markets
    .map((m) => {
      const yesPct = ((m.noPool / (m.yesPool + m.noPool)) * 100).toFixed(0);
      return isTr
        ? `- ${m.title} | %${yesPct} Evet | Hacim: ${m.volume} P | ${m.traderCount} tahminci | Bitis: ${m.resolutionDate.toISOString().split("T")[0]}`
        : `- ${m.title} | ${yesPct}% Yes | Volume: ${m.volume} P | ${m.traderCount} forecasters | Ends: ${m.resolutionDate.toISOString().split("T")[0]}`;
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
- Guncel bilgi gerektiginde web araması yap (altin fiyati, doviz kuru, son haberler vs.)

AKTIF PIYASALAR:
${marketContext}${specificMarketContext}

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
- Use web search when current information is needed (gold prices, exchange rates, latest news, etc.)

ACTIVE MARKETS:
${marketContext}${specificMarketContext}

Answer the user's question in the context of these markets. If they ask about a specific market, use that market's details.`;

  // Build messages from DB history (if conversation has prior messages) or from passed history
  const dbMessages = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const messages: { role: "user" | "assistant"; content: string }[] =
    dbMessages.length > 0
      ? [...dbMessages, { role: "user", content: message }]
      : [
          ...(history || []).map((h: { role: string; content: string }) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          { role: "user", content: message },
        ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3,
      },
    ],
  });

  // Extract text from response, skipping tool use/result blocks
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n\n");

  // Save both messages to conversation
  await prisma.chatMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
      {
        conversationId: conversation.id,
        role: "assistant",
        content: text,
      },
    ],
  });

  // Update conversation timestamp (and title if first message)
  const updateData: { updatedAt: Date; title?: string; marketId?: string } = {
    updatedAt: new Date(),
  };
  if (!conversation.title && message) {
    updateData.title = message.slice(0, 50);
  }
  if (marketId && !conversation.marketId) {
    updateData.marketId = marketId;
  }
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: updateData,
  });

  return NextResponse.json({
    response: text,
    conversationId: conversation.id,
  });
}

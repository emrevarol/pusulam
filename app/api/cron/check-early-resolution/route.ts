import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    authHeader === `Bearer ${process.env.INTERNAL_SECRET}`;

  if (process.env.CRON_SECRET && !isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all OPEN markets
  const openMarkets = await prisma.market.findMany({
    where: { status: "OPEN" },
    select: { id: true, title: true, description: true, resolutionDate: true },
  });

  if (openMarkets.length === 0) {
    return NextResponse.json({ checked: 0, halted: 0 });
  }

  const halted: string[] = [];

  // Check each market with AI
  for (const market of openMarkets) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 1,
          },
        ],
        messages: [
          {
            role: "user",
            content: `Check if this prediction market's event has ALREADY occurred (resolved early).

MARKET: ${market.title}
DESCRIPTION: ${market.description}
DEADLINE: ${market.resolutionDate.toISOString()}

Search for the latest news. Has the event already happened definitively?

Reply with ONLY one of:
- "RESOLVED_YES" if the event has definitely happened (YES outcome is certain)
- "RESOLVED_NO" if it's now impossible for the event to happen (NO outcome is certain)
- "STILL_OPEN" if the outcome is still uncertain

Your answer:`,
          },
        ],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join(" ")
        .trim()
        .toUpperCase();

      if (text.includes("RESOLVED_YES") || text.includes("RESOLVED_NO")) {
        const outcome = text.includes("RESOLVED_YES") ? "YES" : "NO";
        await prisma.market.update({
          where: { id: market.id },
          data: {
            status: "HALTED",
            haltedAt: new Date(),
            haltReason: `AI tespit: Olay ${outcome === "YES" ? "gerceklesti" : "artik imkansiz"}. Admin onay bekliyor.`,
          },
        });
        halted.push(market.title);
      }
    } catch (err) {
      console.error(`Early resolution check failed for ${market.id}:`, err);
    }
  }

  return NextResponse.json({
    checked: openMarkets.length,
    halted: halted.length,
    haltedMarkets: halted,
  });
}

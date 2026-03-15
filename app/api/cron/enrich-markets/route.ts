import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronAuth } from "@/lib/cron-auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// Free APIs for live data
async function fetchBitcoinPrice(): Promise<string | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd",
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.stringify({
      bitcoin: data.bitcoin?.usd,
      ethereum: data.ethereum?.usd,
    });
  } catch {
    return null;
  }
}

async function fetchForexRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=TRY,EUR,GBP",
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates || null;
  } catch {
    return null;
  }
}

async function fetchGoldPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU",
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // XAU is price per ounce inverted
    return data.rates?.XAU ? Math.round(1 / data.rates.XAU) : null;
  } catch {
    return null;
  }
}

// Match live data to markets by keywords
function matchLiveData(
  title: string,
  crypto: { bitcoin?: number; ethereum?: number } | null,
  forex: Record<string, number> | null,
  gold: number | null
): { price: string; label: string; source: string } | null {
  const t = title.toLowerCase();

  if ((t.includes("bitcoin") || t.includes("btc")) && crypto?.bitcoin) {
    return {
      price: `$${crypto.bitcoin.toLocaleString("en-US")}`,
      label: "Bitcoin",
      source: "CoinGecko",
    };
  }
  if ((t.includes("ethereum") || t.includes("eth")) && crypto?.ethereum) {
    return {
      price: `$${crypto.ethereum.toLocaleString("en-US")}`,
      label: "Ethereum",
      source: "CoinGecko",
    };
  }
  if ((t.includes("dolar") || t.includes("usd/try") || t.includes("dolar/tl")) && forex?.TRY) {
    return {
      price: `${forex.TRY.toFixed(2)} ₺`,
      label: "USD/TRY",
      source: "ExchangeRate",
    };
  }
  if ((t.includes("altın") || t.includes("altin") || t.includes("gold") || t.includes("ons")) && gold) {
    return {
      price: `$${gold.toLocaleString("en-US")}`,
      label: "Altın/Ons",
      source: "MetalPrice",
    };
  }
  return null;
}

/**
 * Enrich markets with live data + recent news.
 * Runs hourly alongside sync-prices.
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const openMarkets = await prisma.market.findMany({
    where: { status: "OPEN" },
    select: { id: true, title: true, description: true, category: true },
  });

  if (openMarkets.length === 0) {
    return NextResponse.json({ enriched: 0 });
  }

  // 1. Fetch live data from free APIs
  const [cryptoRaw, forex, gold] = await Promise.all([
    fetchBitcoinPrice(),
    fetchForexRates(),
    fetchGoldPrice(),
  ]);

  const crypto = cryptoRaw ? JSON.parse(cryptoRaw) : null;
  const now = new Date().toISOString();
  let liveDataUpdated = 0;

  for (const market of openMarkets) {
    const live = matchLiveData(market.title, crypto, forex, gold);
    if (live) {
      await prisma.market.update({
        where: { id: market.id },
        data: { liveData: { ...live, updatedAt: now } },
      });
      liveDataUpdated++;
    }
  }

  // 2. Fetch news for markets using AI (batch — one call for all markets)
  let newsUpdated = 0;
  try {
    const marketList = openMarkets
      .map((m, i) => `${i}. ${m.title}`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Search for the latest news about these prediction market topics. For each market, find 1-2 recent, relevant news articles.

MARKETS:
${marketList}

Return a JSON object where keys are market indices (as strings) and values are arrays of news items. Each news item: {"title": "headline", "url": "https://...", "source": "Reuters/BBC/etc", "date": "2026-03-15"}

Only include markets where you found relevant recent news. Skip markets with no news. Example:
{"0": [{"title": "...", "url": "...", "source": "...", "date": "..."}], "3": [...]}

Return ONLY the JSON object, nothing else.`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const newsData = JSON.parse(jsonMatch[0]) as Record<
        string,
        Array<{ title: string; url: string; source: string; date: string }>
      >;

      for (const [indexStr, articles] of Object.entries(newsData)) {
        const idx = parseInt(indexStr);
        const market = openMarkets[idx];
        if (!market || !Array.isArray(articles) || articles.length === 0) continue;

        // Validate and clean articles
        const cleanArticles = articles
          .filter((a) => a.title && a.source)
          .slice(0, 3)
          .map((a) => ({
            title: a.title,
            url: a.url || "",
            source: a.source,
            date: a.date || now.split("T")[0],
          }));

        if (cleanArticles.length > 0) {
          await prisma.market.update({
            where: { id: market.id },
            data: { recentNews: cleanArticles },
          });
          newsUpdated++;
        }
      }
    }
  } catch (err) {
    console.error("News enrichment failed:", err);
  }

  return NextResponse.json({
    markets: openMarkets.length,
    liveDataUpdated,
    newsUpdated,
    timestamp: now,
  });
}

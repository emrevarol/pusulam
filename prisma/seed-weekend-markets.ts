import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Today: Friday March 13, 2026
// Oscar ceremony: Sunday March 15, 2026
// These are REAL Polymarket markets with real odds
const markets = [
  // === OSCAR 2026 — Bu Pazar Gece (15 Mart) ===
  {
    title: "Oscar 2026: En Iyi Film odulunu 'One Battle After Another' alir mi?",
    description:
      "98. Akademi Odulleri'nde En Iyi Film odulunu 'One Battle After Another' kazanirsa EVET. Toren 15 Mart 2026 Pazar gece (Turkiye saati Pazartesi sabah). Polymarket'te %75 olasilikla favori, $31.4M hacim.",
    titleEn: "Oscars 2026: Will 'One Battle After Another' win Best Picture?",
    category: "GUNDEM",
    slug: "oscar-2026-en-iyi-film",
    resolutionDate: new Date("2026-03-16T06:00:00Z"), // TR saati pazartesi sabah
    yesPool: 2500,
    noPool: 7500,
    volume: 8900,
    traderCount: 345,
  },
  {
    title: "Oscar 2026: En Iyi Erkek Oyuncu Michael B. Jordan mi?",
    description:
      "98. Akademi Odulleri'nde En Iyi Erkek Oyuncu odulunu Michael B. Jordan kazanirsa EVET. Polymarket'te %55 favori. Rakipleri: Timothee Chalamet (%31), Leonardo DiCaprio (%7).",
    titleEn: "Oscars 2026: Will Michael B. Jordan win Best Actor?",
    category: "GUNDEM",
    slug: "oscar-2026-en-iyi-erkek-oyuncu",
    resolutionDate: new Date("2026-03-16T06:00:00Z"),
    yesPool: 4500,
    noPool: 5500,
    volume: 5200,
    traderCount: 198,
  },
  {
    title: "Oscar 2026: En Iyi Kadin Oyuncu Jessie Buckley mi?",
    description:
      "98. Akademi Odulleri'nde En Iyi Kadin Oyuncu odulunu Jessie Buckley kazanirsa EVET. Polymarket'te %97 ile buyuk favori.",
    titleEn: "Oscars 2026: Will Jessie Buckley win Best Actress?",
    category: "GUNDEM",
    slug: "oscar-2026-en-iyi-kadin-oyuncu",
    resolutionDate: new Date("2026-03-16T06:00:00Z"),
    yesPool: 500,
    noPool: 9500,
    volume: 3100,
    traderCount: 156,
  },
  {
    title: "Oscar 2026: En Iyi Yonetmen Paul Thomas Anderson mi?",
    description:
      "98. Akademi Odulleri'nde En Iyi Yonetmen odulunu Paul Thomas Anderson kazanirsa EVET. Polymarket'te %93 favori. Rakibi Ryan Coogler (%7).",
    titleEn: "Oscars 2026: Will Paul Thomas Anderson win Best Director?",
    category: "GUNDEM",
    slug: "oscar-2026-en-iyi-yonetmen",
    resolutionDate: new Date("2026-03-16T06:00:00Z"),
    yesPool: 700,
    noPool: 9300,
    volume: 2800,
    traderCount: 123,
  },
  {
    title: "Oscar 2026: En Iyi Yardimci Erkek Oyuncu Sean Penn mi?",
    description:
      "98. Akademi Odulleri'nde En Iyi Yardimci Erkek Oyuncu odulunu Sean Penn kazanirsa EVET. Polymarket'te %73 favori. Rakipleri: Stellan Skarsgard (%15), Delroy Lindo (%11).",
    titleEn: "Oscars 2026: Will Sean Penn win Best Supporting Actor?",
    category: "GUNDEM",
    slug: "oscar-2026-en-iyi-yardimci-erkek",
    resolutionDate: new Date("2026-03-16T06:00:00Z"),
    yesPool: 2700,
    noPool: 7300,
    volume: 2400,
    traderCount: 98,
  },
  {
    title: "Oscar 2026: En Iyi Yardimci Kadin Oyuncu Amy Madigan mi?",
    description:
      "98. Akademi Odulleri'nde En Iyi Yardimci Kadin Oyuncu odulunu Amy Madigan kazanirsa EVET. Polymarket'te %47 ile az farkla onde. Rakipleri: Teyana Taylor (%32), Wunmi Mosaku (%17).",
    titleEn: "Oscars 2026: Will Amy Madigan win Best Supporting Actress?",
    category: "GUNDEM",
    slug: "oscar-2026-en-iyi-yardimci-kadin",
    resolutionDate: new Date("2026-03-16T06:00:00Z"),
    yesPool: 5300,
    noPool: 4700,
    volume: 1900,
    traderCount: 87,
  },

  // === BITCOIN BU HAFTA SONU ===
  {
    title: "Bitcoin bu hafta sonu (16 Mart) $82,000 uzerinde mi?",
    description:
      "BTC/USD fiyati 16 Mart 2026 Pazar gunu 23:59 UTC'de $82,000 ve uzerindeyse EVET. CoinGecko verisi baz alinir. Polymarket'te Bitcoin Mart fiyat marketi $37.7M hacimle trending.",
    titleEn: "Will Bitcoin be above $82K on Sunday March 16?",
    category: "TEKNOLOJI",
    slug: "bitcoin-82k-16-mart-2026",
    resolutionDate: new Date("2026-03-16T23:59:00Z"),
    yesPool: 5500,
    noPool: 4500,
    volume: 4300,
    traderCount: 187,
  },

  // === ELON MUSK TWEET — Polymarket'te gercek market ===
  {
    title: "Elon Musk bu hafta sonu 100'den fazla tweet atar mi?",
    description:
      "Elon Musk 14-16 Mart 2026 arasinda (Cuma-Pazar) X/Twitter'da 100 veya daha fazla tweet/repost yaparsa EVET. Polymarket'te $126K hacimli aktif market.",
    titleEn: "Will Elon Musk post 100+ tweets this weekend (March 14-16)?",
    category: "TEKNOLOJI",
    slug: "musk-100-tweet-hafta-sonu-mart-2026",
    resolutionDate: new Date("2026-03-16T16:00:00Z"),
    yesPool: 4000,
    noPool: 6000,
    volume: 1800,
    traderCount: 76,
  },
];

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("Admin user not found!");
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const m of markets) {
    const existing = await prisma.market.findUnique({ where: { slug: m.slug } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.market.create({
      data: {
        title: m.title,
        description: m.description,
        titleTranslations: m.titleEn ? { en: m.titleEn } : undefined,
        category: m.category,
        slug: m.slug,
        resolutionDate: m.resolutionDate,
        yesPool: m.yesPool,
        noPool: m.noPool,
        volume: m.volume,
        traderCount: m.traderCount,
        createdById: admin.id,
      },
    });
    created++;
    console.log(`✓ ${m.title}`);
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
  await prisma.$disconnect();
}

main();

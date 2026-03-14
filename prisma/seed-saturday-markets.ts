import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Saturday March 14, 2026
const markets = [
  // === KRIPTO — Cumartesi kapaniyor ===
  {
    title: "Bitcoin 14 Mart Cumartesi $72,000 uzerinde mi?",
    description:
      "BTC/USD fiyati 14 Mart 2026 Cumartesi gunu 21:00 UTC'de $72,000 ve uzerindeyse EVET. Binance BTC/USDT verisi baz alinir. Polymarket'te $1.5M hacimli aktif market — oranlar $70-72K araligina isaret ediyor.",
    titleEn: "Will Bitcoin be above $72K on Saturday March 14?",
    category: "TEKNOLOJI",
    slug: "bitcoin-72k-14-mart-2026",
    resolutionDate: new Date("2026-03-14T21:00:00Z"),
    yesPool: 7400,
    noPool: 2600,
    volume: 3200,
    traderCount: 134,
  },
  {
    title: "Ethereum 14 Mart'ta duser mi?",
    description:
      "ETH/USD fiyati 14 Mart 2026 Cumartesi kapanisinda bir onceki gune gore dusukse EVET. Binance ETH/USDT verisi baz alinir. Polymarket'te %69.5 dusus bekleniyor.",
    titleEn: "Will Ethereum be down on March 14?",
    category: "TEKNOLOJI",
    slug: "ethereum-dusus-14-mart-2026",
    resolutionDate: new Date("2026-03-14T21:00:00Z"),
    yesPool: 3100,
    noPool: 6900,
    volume: 1400,
    traderCount: 67,
  },

  // === ENERJI — QatarEnergy LNG (gercek Polymarket marketi) ===
  {
    title: "QatarEnergy LNG uretimini 14 Mart'a kadar baslatir mi?",
    description:
      "QatarEnergy, askeri saldirilarin ardindan ilan ettigi mücbir sebep (force majeure) kapsaminda durdurulan LNG uretimini 14 Mart 2026'ya kadar yeniden baslatirsa EVET. Polymarket'te %1 — piyasa yeniden baslatma beklemiyor. $112K hacim.",
    titleEn: "Will QatarEnergy resume LNG production by March 14?",
    category: "EKONOMI",
    slug: "qatarenergy-lng-14-mart-2026",
    resolutionDate: new Date("2026-03-15T03:59:00Z"), // 11:59 PM ET = 03:59 UTC+0 next day
    yesPool: 9900,
    noPool: 100,
    volume: 2100,
    traderCount: 89,
  },

  // === DUNYA — Cumartesi haberleri ===
  {
    title: "ABD 14 Mart'ta Iran'a yeni yaptirim paketi aciklar mi?",
    description:
      "ABD yonetimi 14 Mart 2026 Cumartesi gunu sonuna kadar Iran'a yonelik yeni bir yaptirim paketi aciklama yaparsa EVET. Iran savasi devam ederken yaptirim baskisi artiriliyor.",
    titleEn: "Will US announce new Iran sanctions package on March 14?",
    category: "DUNYA",
    slug: "abd-iran-yaptirim-14-mart-2026",
    resolutionDate: new Date("2026-03-14T23:59:00Z"),
    yesPool: 7000,
    noPool: 3000,
    volume: 1800,
    traderCount: 76,
  },

  // === TURKIYE — Cumartesi ===
  {
    title: "Dolar/TL 14 Mart Cumartesi bankalar arasi kapanista 43.50 uzerinde mi?",
    description:
      "USD/TRY paritesi 14 Mart 2026 Cumartesi gunu serbest piyasa kapanisinda 43.50 ve uzerindeyse EVET. TCMB Mart'ta faizi %37'de sabit tuttu, Iran gerginligi TL uzerinde baski yaratiyor.",
    titleEn: "Will USD/TRY close above 43.50 on Saturday March 14?",
    category: "EKONOMI",
    slug: "dolar-tl-4350-14-mart-2026",
    resolutionDate: new Date("2026-03-14T15:00:00Z"),
    yesPool: 5000,
    noPool: 5000,
    volume: 2400,
    traderCount: 98,
  },
  {
    title: "Altin/ons 14 Mart'ta $3,000 uzerinde mi?",
    description:
      "Altin spot fiyati (XAU/USD) 14 Mart 2026 Cumartesi kapanisinda $3,000/ons ve uzerindeyse EVET. Iran savasi ve jeopolitik belirsizlik altini yukari tasimaya devam ediyor.",
    titleEn: "Will gold be above $3,000/oz on March 14?",
    category: "EKONOMI",
    slug: "altin-3000-14-mart-2026",
    resolutionDate: new Date("2026-03-14T21:00:00Z"),
    yesPool: 3500,
    noPool: 6500,
    volume: 2900,
    traderCount: 112,
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
    const existing = await prisma.market.findUnique({
      where: { slug: m.slug },
    });
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

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// CPMM pool helper: for target YES probability p and liquidity L
// yesPool = L * (1 - p), noPool = L * p
// Verify: yesPrice = noPool / (yesPool + noPool) = L*p / L = p ✓
function pools(yesProbability: number, liquidity = 10000) {
  return {
    yesPool: Math.round(liquidity * (1 - yesProbability)),
    noPool: Math.round(liquidity * yesProbability),
  };
}

async function main() {
  console.log("Seeding pusulam database...");

  // Clean existing data
  await prisma.prediction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.position.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.market.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("test123", 10);

  // Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@pusulam.ai",
      username: "admin",
      displayName: "Pusulam Admin",
      passwordHash: hash,
      balance: 10000,
      reputation: 95,
      role: "ADMIN",
    },
  });

  const emre = await prisma.user.create({
    data: {
      email: "emre@pusulam.ai",
      username: "emrevarol",
      displayName: "Emre Varol",
      passwordHash: hash,
      balance: 5000,
      reputation: 82,
      role: "PRO",
      bio: "Kolektif zeka meraklisi",
    },
  });

  const ali = await prisma.user.create({
    data: {
      email: "ali@test.com",
      username: "alioz",
      displayName: "Ali Ozsoy",
      passwordHash: hash,
      balance: 3000,
      reputation: 45,
    },
  });

  const zeynep = await prisma.user.create({
    data: {
      email: "zeynep@test.com",
      username: "zeynepk",
      displayName: "Zeynep Kaya",
      passwordHash: hash,
      balance: 4200,
      reputation: 67,
    },
  });

  const mehmet = await prisma.user.create({
    data: {
      email: "mehmet@test.com",
      username: "mehmetd",
      displayName: "Mehmet Demir",
      passwordHash: hash,
      balance: 1800,
      reputation: 33,
    },
  });

  // Badges
  const badges = await Promise.all([
    prisma.badge.create({
      data: { name: "Ilk Tahmin", description: "Ilk tahminini yaptin!", icon: "🎯", tier: "BRONZE", requirement: '{"type":"trade_count","value":1}' },
    }),
    prisma.badge.create({
      data: { name: "Tahminci", description: "10 tahmin yaptin", icon: "📊", tier: "SILVER", requirement: '{"type":"trade_count","value":10}' },
    }),
    prisma.badge.create({
      data: { name: "Uzman Tahminci", description: "50 tahmin yaptin", icon: "🧠", tier: "GOLD", requirement: '{"type":"trade_count","value":50}' },
    }),
    prisma.badge.create({
      data: { name: "Kalibrasyon Ustasi", description: "Kalibrasyon skorun 80+", icon: "🎯", tier: "PLATINUM", requirement: '{"type":"reputation","value":80}' },
    }),
    prisma.badge.create({
      data: { name: "Piyasa Kurucusu", description: "Ilk piyasani olusturdun", icon: "🏗️", tier: "BRONZE", requirement: '{"type":"market_created","value":1}' },
    }),
    prisma.badge.create({
      data: { name: "7 Gunluk Seri", description: "7 gun ust uste tahmin yaptin", icon: "🔥", tier: "SILVER", requirement: '{"type":"streak","value":7}' },
    }),
  ]);

  await prisma.userBadge.createMany({
    data: [
      { userId: emre.id, badgeId: badges[0].id },
      { userId: emre.id, badgeId: badges[1].id },
      { userId: emre.id, badgeId: badges[3].id },
      { userId: ali.id, badgeId: badges[0].id },
      { userId: zeynep.id, badgeId: badges[0].id },
      { userId: zeynep.id, badgeId: badges[1].id },
    ],
  });

  // ============================================================
  // MARKETS — Real events, March 2026, real-ish probabilities
  // Pool liquidity = 10000 for smooth trading
  // ============================================================

  const markets = await Promise.all([
    // --- EKONOMI ---
    prisma.market.create({
      data: {
        title: "Dolar/TL Haziran 2026 sonunda 46 TL'yi gecer mi?",
        description: "TCMB resmi kuru baz alinacaktir. 30 Haziran 2026 gun sonu kapanisinda USD/TRY 46.00 ve uzerindeyse EVET. Su an ~44 TL, Iran savasi ve petrol fiyatlari TL uzerinde ek baski yaratiyor.",
        category: "EKONOMI",
        slug: "dolar-tl-haziran-2026-46-gecer-mi",
        resolutionDate: new Date("2026-06-30"),
        ...pools(0.55),
        volume: 12400, traderCount: 234, featured: true,
        createdById: admin.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "TCMB Nisan 2026'da faiz indirimine ara verir mi?",
        description: "TCMB PPK Nisan 2026 toplantisinda politika faizini sabit tutarsa EVET. Faiz su an %37, ardisik indirimler yapildi ama Iran savasi kaynakli petrol soku duraklatabilir.",
        category: "EKONOMI",
        slug: "tcmb-nisan-2026-faiz-indirimi-ara",
        resolutionDate: new Date("2026-04-30"),
        ...pools(0.45),
        volume: 8900, traderCount: 178, featured: true,
        createdById: admin.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "Brent petrol Mart sonu $100/varil uzerinde kalir mi?",
        description: "Brent ham petrol vadeli fiyati 31 Mart 2026 kapanisinda $100/varil ve uzerindeyse EVET. Iran savasi nedeniyle Hormuz Bogazi kapandi, fiyatlar $70'ten $119'a firladi.",
        category: "EKONOMI",
        slug: "brent-petrol-mart-2026-100-dolar",
        resolutionDate: new Date("2026-03-31"),
        ...pools(0.40),
        volume: 15600, traderCount: 312,
        createdById: emre.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "Turkiye Mart 2026 yillik enflasyonu %35'i gecer mi?",
        description: "TUIK Mart 2026 yillik TUFE verisi %35.00 ve uzerindeyse EVET. Subat'ta %31.53 aciklandi, petrol fiyatlari ek baski yaratabilir.",
        category: "EKONOMI",
        slug: "turkiye-mart-2026-enflasyon-35",
        resolutionDate: new Date("2026-04-05"),
        ...pools(0.35),
        volume: 6200, traderCount: 145,
        createdById: ali.id,
      },
    }),

    // --- SIYASET ---
    prisma.market.create({
      data: {
        title: "Imamoglu davasi 2026 sonuna kadar karara baglanir mi?",
        description: "IBB Baskani Ekrem Imamoglu'nun 9 Mart 2026'da baslayan yolsuzluk davasinda 2026 yili icinde karar cikarsa EVET. 400 sanikli dava, 3900 sayfalik iddianame.",
        category: "SIYASET",
        slug: "imamoglu-davasi-2026-karar",
        resolutionDate: new Date("2026-12-31"),
        ...pools(0.15),
        volume: 18900, traderCount: 456, featured: true,
        createdById: admin.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "15 yas alti sosyal medya yasagi 2026'da yasalasir mi?",
        description: "AKP'nin 4 Mart'ta TBMM'ye sundugu 15 yas alti sosyal medya yasagi tasarisi 2026 yili icinde yasalasirsa EVET.",
        category: "SIYASET",
        slug: "sosyal-medya-yasagi-15-yas-2026",
        resolutionDate: new Date("2026-12-31"),
        ...pools(0.72),
        volume: 5400, traderCount: 98,
        createdById: zeynep.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "2027 sonuna kadar erken secim ilan edilir mi?",
        description: "Cumhurbaskanligi veya milletvekili erken secimi 2027 sonuna kadar resmi olarak ilan edilirse EVET. Erdogan'in gorev suresi 2028'de doluyor.",
        category: "SIYASET",
        slug: "erken-secim-2027-sonuna-kadar",
        resolutionDate: new Date("2027-12-31"),
        ...pools(0.25),
        volume: 22100, traderCount: 534,
        createdById: admin.id,
      },
    }),

    // --- DUNYA ---
    prisma.market.create({
      data: {
        title: "ABD-Iran savasi Nisan sonuna kadar ateskes ile biter mi?",
        description: "ABD/Israil ve Iran arasinda resmi ateskes ilan edilirse EVET. Savas 28 Subat'ta basladi. Trump 'yakinda biter' diyor, Iran sartlari agir.",
        category: "DUNYA",
        slug: "abd-iran-ateskes-nisan-2026",
        resolutionDate: new Date("2026-04-30"),
        ...pools(0.50),
        volume: 34200, traderCount: 789, featured: true,
        createdById: admin.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "NATO Ankara Zirvesi Temmuz'da planlandigi gibi yapilir mi?",
        description: "2026 NATO Liderler Zirvesi Ankara Bestepe'de 7-8 Temmuz'da planlandigi sekilde yapilirsa EVET. Iran savasi nedeniyle ertelenme riski var.",
        category: "DUNYA",
        slug: "nato-ankara-zirvesi-temmuz-2026",
        resolutionDate: new Date("2026-07-10"),
        ...pools(0.82),
        volume: 4800, traderCount: 67,
        createdById: emre.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "Trump 2026 sonuna kadar gorevden alinir mi?",
        description: "ABD Temsilciler Meclisi 2026 icinde Trump'a resmi azil (impeachment) oylamasi yaparsa EVET. Polymarket'ta su an %14.",
        category: "DUNYA",
        slug: "trump-impeachment-2026",
        resolutionDate: new Date("2026-12-31"),
        ...pools(0.14),
        volume: 28500, traderCount: 621,
        createdById: admin.id,
      },
    }),

    // --- TEKNOLOJI ---
    prisma.market.create({
      data: {
        title: "TOGG 2026'da 60.000 arac uretir mi?",
        description: "TOGG'un resmi aciklamasina gore 2026 toplam uretimi 60.000 ve uzerindeyse EVET. 2025'te ~40.000 uretildi, resmi hedef 60.000+.",
        category: "TEKNOLOJI",
        slug: "togg-2026-60bin-uretim",
        resolutionDate: new Date("2027-01-15"),
        ...pools(0.58),
        volume: 7600, traderCount: 134,
        createdById: emre.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "2026 sonunda en iyi AI modeli Anthropic'in mi olur?",
        description: "LMSys Arena siralamasinda 31 Aralik 2026 itibariyle 1. sirada Anthropic modeli (Claude) varsa EVET. Su an Claude Opus 4.6 birinci, Gemini 3.1 Pro 4 Elo farkla yaklasti.",
        category: "TEKNOLOJI",
        slug: "en-iyi-ai-modeli-2026-anthropic",
        resolutionDate: new Date("2026-12-31"),
        ...pools(0.38),
        volume: 9300, traderCount: 187,
        createdById: ali.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "Bitcoin 2026 sonunda $100.000 uzerinde olur mu?",
        description: "CoinMarketCap verisine gore 31 Aralik 2026 kapanisinda BTC $100,000 ve uzerindeyse EVET. Su an $65K-73K bandinda, Iran savasi piyasalari vurdu.",
        category: "TEKNOLOJI",
        slug: "bitcoin-2026-100bin-dolar",
        resolutionDate: new Date("2026-12-31"),
        ...pools(0.52),
        volume: 41200, traderCount: 912,
        createdById: admin.id,
      },
    }),

    // --- GUNDEM ---
    prisma.market.create({
      data: {
        title: "Hormuz Bogazi Nisan sonuna kadar ticari gemilere acilir mi?",
        description: "Iran Devrim Muhafizlari Hormuz Bogazi'ni kapatti. Nisan 2026 sonuna kadar ticari tanker trafigi savas oncesi seviyeye donerse EVET.",
        category: "GUNDEM",
        slug: "hormuz-bogazi-nisan-2026-acilir-mi",
        resolutionDate: new Date("2026-04-30"),
        ...pools(0.35),
        volume: 19800, traderCount: 423, featured: true,
        createdById: admin.id,
      },
    }),
    prisma.market.create({
      data: {
        title: "Istanbul'da 2026'da 7+ buyuklugunde deprem olur mu?",
        description: "AFAD veya USGS verisine gore Istanbul 100km yaricapta 7.0+ buyuklukte deprem kaydedilirse EVET.",
        category: "GUNDEM",
        slug: "istanbul-deprem-2026-7-buyukluk",
        resolutionDate: new Date("2026-12-31"),
        ...pools(0.08),
        volume: 14300, traderCount: 367,
        createdById: admin.id,
      },
    }),
  ]);

  // Sample trades and positions
  await prisma.trade.createMany({
    data: [
      { direction: "BUY", side: "YES", shares: 50, price: 0.55, cost: 27.5, userId: emre.id, marketId: markets[0].id },
      { direction: "BUY", side: "NO", shares: 30, price: 0.45, cost: 13.5, userId: ali.id, marketId: markets[0].id },
      { direction: "BUY", side: "YES", shares: 80, price: 0.50, cost: 40, userId: zeynep.id, marketId: markets[7].id },
      { direction: "BUY", side: "YES", shares: 40, price: 0.15, cost: 6, userId: mehmet.id, marketId: markets[4].id },
      { direction: "BUY", side: "NO", shares: 60, price: 0.85, cost: 51, userId: emre.id, marketId: markets[4].id },
      { direction: "BUY", side: "YES", shares: 100, price: 0.52, cost: 52, userId: emre.id, marketId: markets[12].id },
      { direction: "BUY", side: "NO", shares: 45, price: 0.48, cost: 21.6, userId: ali.id, marketId: markets[12].id },
    ],
  });

  await prisma.position.createMany({
    data: [
      { side: "YES", shares: 50, avgPrice: 0.55, userId: emre.id, marketId: markets[0].id },
      { side: "NO", shares: 30, avgPrice: 0.45, userId: ali.id, marketId: markets[0].id },
      { side: "YES", shares: 80, avgPrice: 0.50, userId: zeynep.id, marketId: markets[7].id },
      { side: "YES", shares: 40, avgPrice: 0.15, userId: mehmet.id, marketId: markets[4].id },
      { side: "NO", shares: 60, avgPrice: 0.85, userId: emre.id, marketId: markets[4].id },
      { side: "YES", shares: 100, avgPrice: 0.52, userId: emre.id, marketId: markets[12].id },
      { side: "NO", shares: 45, avgPrice: 0.48, userId: ali.id, marketId: markets[12].id },
    ],
  });

  // Predictions with reasoning
  await prisma.prediction.createMany({
    data: [
      {
        probability: 0.62,
        reasoning: "Cari acik buyuyor, petrol soku TL'ye ekstra baski yapiyor. Haziran'a kadar 46'yi goruruz.",
        userId: emre.id, marketId: markets[0].id,
      },
      {
        probability: 0.40,
        reasoning: "TCMB siki durusa devam ederse carry trade TL'yi destekler. 46 zor.",
        userId: ali.id, marketId: markets[0].id,
      },
      {
        probability: 0.55,
        reasoning: "Ateskes olmadan Hormuz acilmaz. Iki taraf da geri adim atmiyor.",
        userId: zeynep.id, marketId: markets[7].id,
      },
      {
        probability: 0.12,
        reasoning: "400 sanikli dava 1 yilda bitmez. Turk yargi sistemi bu kadar hizli calismiyor.",
        userId: mehmet.id, marketId: markets[4].id,
      },
      {
        probability: 0.60,
        reasoning: "Halving etkisi 12-18 ay sonra hissedilir. 2024 halving'i 2026 sonunda 100K'yi getirir.",
        userId: emre.id, marketId: markets[12].id,
      },
    ],
  });

  // Comments
  await prisma.comment.createMany({
    data: [
      { content: "Petrol 100'un uzerinde kaldikca dolar 46'yi gecer. Hormuz kapali oldukca bu kacinilmaz.", userId: ali.id, marketId: markets[0].id },
      { content: "TCMB surecinde cok sikilar. Petrol yukselirsa bile faiz indirimi duraklatamazlar, siyasi baski var.", userId: zeynep.id, marketId: markets[1].id },
      { content: "Iran savasi 2 haftadir suruyor, Trump 'yakinda biter' demesine ragmen hicbir somut adim yok.", userId: mehmet.id, marketId: markets[7].id },
      { content: "Imamoglu davasi siyasi motivasyonlu, bu kadar buyuk davada yillar alir.", userId: emre.id, marketId: markets[4].id },
      { content: "Bitcoin ETF akislari savastan bagimsiz devam ediyor. Kurumsal talep guclu.", userId: ali.id, marketId: markets[12].id },
      { content: "NATO zirvesi kesinlikle yapilir, Turkiye ev sahibi olarak iptal etmez. En fazla ajanda degisir.", userId: zeynep.id, marketId: markets[8].id },
    ],
  });

  console.log("Seed tamamlandi!");
  console.log(`  5 kullanici`);
  console.log(`  ${markets.length} piyasa (gercek gundem)`);
  console.log(`  ${badges.length} rozet`);
  console.log(`  Havuz likiditesi: 10.000 (smooth trading)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

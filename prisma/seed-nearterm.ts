import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// CPMM pool helper: for target YES probability p and liquidity L
// yesPool = L * (1 - p), noPool = L * p
// Verify: yesPrice = noPool / (yesPool + noPool) = L*p / L = p
function pools(yesProbability: number, liquidity = 10000) {
  return {
    yesPool: Math.round(liquidity * (1 - yesProbability)),
    noPool: Math.round(liquidity * yesProbability),
  };
}

async function main() {
  console.log("Near-term markets ekleniyor (mevcut veri silinmeyecek)...");

  // Find admin user
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!admin) {
    console.error("ADMIN kullanici bulunamadi! Once ana seed.ts'i calistirin.");
    process.exit(1);
  }

  console.log(`Admin bulundu: ${admin.displayName} (${admin.email})`);

  const nearTermMarkets = [
    {
      title: "Dolar/TL 14 Mart kapanisi 44 TL uzerinde mi?",
      description:
        "TCMB resmi kuruna gore 14 Mart 2026 gun sonu kapanisinda USD/TRY 44.00 ve uzerindeyse EVET olarak sonuclanir.",
      titleTranslations: {
        en: "Will USD/TRY close above 44 TL on March 14?",
      },
      descriptionTranslations: {
        en: "Based on TCMB official rate. If USD/TRY is 44.00 or above at close on March 14, 2026, resolves YES.",
      },
      category: "EKONOMI",
      slug: "dolar-tl-14-mart-2026-44-uzerinde",
      resolutionDate: new Date("2026-03-14"),
      ...pools(0.65),
      volume: 3200,
      traderCount: 87,
      featured: true,
      createdById: admin.id,
    },
    {
      title: "Brent petrol 16 Mart'a kadar $115 uzerinde kalir mi?",
      description:
        "Brent ham petrol vadeli fiyati 16 Mart 2026 kapanisinda $115/varil ve uzerindeyse EVET. Iran savasi ve Hormuz Bogazi gerilimi fiyatlari yuksek tutuyor.",
      titleTranslations: {
        en: "Will Brent crude stay above $115 by March 16?",
      },
      descriptionTranslations: {
        en: "If Brent crude oil futures price is $115/barrel or above at close on March 16, 2026, resolves YES. Iran war and Strait of Hormuz tensions keeping prices elevated.",
      },
      category: "EKONOMI",
      slug: "brent-petrol-16-mart-2026-115-dolar",
      resolutionDate: new Date("2026-03-16"),
      ...pools(0.55),
      volume: 4100,
      traderCount: 112,
      featured: false,
      createdById: admin.id,
    },
    {
      title: "TBMM bu hafta sosyal medya yasagini gorusur mu?",
      description:
        "AKP'nin 15 yas alti sosyal medya yasagi tasarisi 17 Mart 2026'ya kadar TBMM Genel Kurul gundemine alinip gorusulurse EVET.",
      titleTranslations: {
        en: "Will TBMM debate the social media ban bill this week?",
      },
      descriptionTranslations: {
        en: "If AKP's under-15 social media ban bill comes to the TBMM floor for debate by March 17, 2026, resolves YES.",
      },
      category: "SIYASET",
      slug: "tbmm-sosyal-medya-yasagi-17-mart-2026",
      resolutionDate: new Date("2026-03-17"),
      ...pools(0.40),
      volume: 1800,
      traderCount: 54,
      featured: false,
      createdById: admin.id,
    },
    {
      title: "ABD bu hafta Iran'a ek yaptirimlari aciklar mi?",
      description:
        "ABD yonetimi 18 Mart 2026'ya kadar Iran'a yeni ek yaptirimlar aciklayarsa EVET. Beyaz Saray resmi aciklamasi baz alinacaktir.",
      titleTranslations: {
        en: "Will the US announce additional Iran sanctions this week?",
      },
      descriptionTranslations: {
        en: "If the US administration announces new additional sanctions on Iran by March 18, 2026, resolves YES. Based on official White House announcement.",
      },
      category: "DUNYA",
      slug: "abd-iran-ek-yaptirimlar-18-mart-2026",
      resolutionDate: new Date("2026-03-18"),
      ...pools(0.60),
      volume: 5600,
      traderCount: 143,
      featured: true,
      createdById: admin.id,
    },
    {
      title: "Bitcoin 20 Mart'a kadar $70K'nin uzerinde kapanir mi?",
      description:
        "CoinMarketCap verisine gore 20 Mart 2026 UTC 00:00 itibariyle BTC $70,000 ve uzerindeyse EVET. Iran savasi sonrasi kripto piyasalari baski altinda.",
      titleTranslations: {
        en: "Will Bitcoin close above $70K by March 20?",
      },
      descriptionTranslations: {
        en: "If BTC is $70,000 or above per CoinMarketCap at UTC 00:00 on March 20, 2026, resolves YES. Crypto markets under pressure following Iran war.",
      },
      category: "TEKNOLOJI",
      slug: "bitcoin-70k-20-mart-2026",
      resolutionDate: new Date("2026-03-20"),
      ...pools(0.45),
      volume: 7800,
      traderCount: 198,
      featured: true,
      createdById: admin.id,
    },
    {
      title: "Istanbul'da 15-20 Mart arasi kar yagar mi?",
      description:
        "Meteoroloji Genel Mudurlugu (MGM) resmi verilerine gore Istanbul ilinde 15-20 Mart 2026 tarihleri arasinda kar yagisi kaydedilirse EVET.",
      titleTranslations: {
        en: "Will it snow in Istanbul between March 15-20?",
      },
      descriptionTranslations: {
        en: "If the Turkish State Meteorological Service (MGM) records snowfall in Istanbul province between March 15-20, 2026, resolves YES.",
      },
      category: "GUNDEM",
      slug: "istanbul-kar-15-20-mart-2026",
      resolutionDate: new Date("2026-03-20"),
      ...pools(0.30),
      volume: 2400,
      traderCount: 76,
      featured: false,
      createdById: admin.id,
    },
    {
      title: "Altin/ons 21 Mart'ta $3,000 uzerinde mi?",
      description:
        "XAU/USD spot fiyati 21 Mart 2026 New York kapanisinda $3,000 ve uzerindeyse EVET. Altin guvenli liman talebiyle yuksek seyrediyor.",
      titleTranslations: {
        en: "Will gold be above $3,000/oz on March 21?",
      },
      descriptionTranslations: {
        en: "If XAU/USD spot price is $3,000 or above at New York close on March 21, 2026, resolves YES. Gold elevated on safe-haven demand.",
      },
      category: "EKONOMI",
      slug: "altin-ons-3000-21-mart-2026",
      resolutionDate: new Date("2026-03-21"),
      ...pools(0.70),
      volume: 6300,
      traderCount: 167,
      featured: true,
      createdById: admin.id,
    },
    {
      title: "Trump bu hafta Iran konusunda baris plani aciklar mi?",
      description:
        "ABD Baskani Trump 22 Mart 2026'ya kadar Iran ile ilgili resmi bir baris/ateskes plani aciklayarsa EVET. Beyaz Saray resmi aciklamasi baz alinir.",
      titleTranslations: {
        en: "Will Trump announce an Iran peace plan this week?",
      },
      descriptionTranslations: {
        en: "If US President Trump announces an official peace/ceasefire plan regarding Iran by March 22, 2026, resolves YES. Based on official White House announcement.",
      },
      category: "DUNYA",
      slug: "trump-iran-baris-plani-22-mart-2026",
      resolutionDate: new Date("2026-03-22"),
      ...pools(0.25),
      volume: 9200,
      traderCount: 231,
      featured: false,
      createdById: admin.id,
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const market of nearTermMarkets) {
    const result = await prisma.market.upsert({
      where: { slug: market.slug },
      update: {
        title: market.title,
        description: market.description,
        titleTranslations: market.titleTranslations,
        descriptionTranslations: market.descriptionTranslations,
        category: market.category,
        resolutionDate: market.resolutionDate,
        yesPool: market.yesPool,
        noPool: market.noPool,
        volume: market.volume,
        traderCount: market.traderCount,
        featured: market.featured,
      },
      create: market,
    });

    // Check if it was newly created vs updated
    const isNew =
      result.createdAt.getTime() > Date.now() - 5000; // created in last 5 seconds
    if (isNew) {
      created++;
      console.log(`  + ${market.slug}`);
    } else {
      skipped++;
      console.log(`  ~ ${market.slug} (guncellendi)`);
    }
  }

  console.log(`\nNear-term seed tamamlandi!`);
  console.log(`  ${created} yeni piyasa olusturuldu`);
  console.log(`  ${skipped} mevcut piyasa guncellendi`);
  console.log(`  Toplam: ${nearTermMarkets.length} yakin vadeli piyasa`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

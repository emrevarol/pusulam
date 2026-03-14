import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Today: Friday March 13, 2026
// Markets based on REAL current events
const markets = [
  // === IRAN SAVASI — en sicak gundem ===
  {
    title: "Iran ateskes anlasmasi 21 Mart Nevruz'a kadar imzalanir mi?",
    description: "ABD-Israel ve Iran arasinda resmi ateskes anlasmasi 21 Mart 2026 Nevruz'a kadar imzalanirsa EVET. Iran'in sartlari: gelecekte saldiri yapilmayacagina dair garanti ve tazminat. Trump 'yakin zamanda bitecek' diyor.",
    titleEn: "Will Iran ceasefire be signed by Nowruz (March 21)?",
    category: "DUNYA",
    slug: "iran-ateskes-nevruz-21-mart-2026",
    resolutionDate: new Date("2026-03-21T23:59:00Z"),
    yesPool: 8000,
    noPool: 2000,
    volume: 15600,
    traderCount: 534,
  },
  {
    title: "Iran Disisleri Bakani Aragci istifa eder mi? (Mart sonu)",
    description: "Iran Disisleri Bakani Abbas Aragci Mart 2026 sonuna kadar istifa eder veya gorevden alinirsa EVET. Aragci ateskes cagrilerini reddetti.",
    titleEn: "Will Iran FM Araghchi resign by end of March?",
    category: "DUNYA",
    slug: "iran-disisleri-aragci-istifa-mart-2026",
    resolutionDate: new Date("2026-03-31T23:59:00Z"),
    yesPool: 9000,
    noPool: 1000,
    volume: 3200,
    traderCount: 145,
  },
  {
    title: "Brent petrol 21 Mart'ta $110 uzerinde mi?",
    description: "Brent ham petrol fiyati 21 Mart 2026 kapanisinda $110/varil ve uzerindeyse EVET. Iran savasi petrol fiyatlarini yuksek tutuyor.",
    titleEn: "Will Brent crude be above $110 on March 21?",
    category: "EKONOMI",
    slug: "brent-petrol-110-21-mart-2026",
    resolutionDate: new Date("2026-03-21T18:00:00Z"),
    yesPool: 4000,
    noPool: 6000,
    volume: 7800,
    traderCount: 267,
  },

  // === TRUMP & ABD ===
  {
    title: "Fed 18 Mart toplantisinda faizi sabit tutar mi?",
    description: "Federal Reserve 18 Mart 2026 FOMC toplantisinda faizi %3.50-3.75 araliginda sabit tutarsa EVET. Piyasa buyuk cogunlukla sabit tutmasini bekliyor.",
    titleEn: "Will the Fed hold rates at the March 18 FOMC meeting?",
    category: "DUNYA",
    slug: "fed-faiz-sabit-18-mart-2026",
    resolutionDate: new Date("2026-03-18T21:00:00Z"),
    yesPool: 1500,
    noPool: 8500,
    volume: 12300,
    traderCount: 456,
  },
  {
    title: "Trump Section 301 sorusturmasiyla AB'ye yeni gumruk vergisi koyar mi? (Mart sonu)",
    description: "Trump yonetimi Section 301 sorusturmasi sonucunda AB'ye yeni gumruk vergisi uygularsa EVET. 60 ulkeye yonelik sorusturma 11 Mart'ta basladi.",
    titleEn: "Will Trump impose new Section 301 tariffs on EU by end of March?",
    category: "DUNYA",
    slug: "trump-section-301-ab-mart-2026",
    resolutionDate: new Date("2026-03-31T23:59:00Z"),
    yesPool: 6000,
    noPool: 4000,
    volume: 8900,
    traderCount: 312,
  },
  {
    title: "Yuksek Mahkeme IEEPA tarife yetkisini geri verir mi? (Nisan sonu)",
    description: "ABD Yuksek Mahkemesi 20 Subat'ta Trump'in IEEPA ile gumruk vergisi koyma yetkisini iptal etti. Nisan 2026 sonuna kadar bu karar tersine cevrilen bir gelisme olursa EVET.",
    titleEn: "Will SCOTUS reverse its IEEPA tariff ruling by end of April?",
    category: "DUNYA",
    slug: "scotus-ieepa-tarife-nisan-2026",
    resolutionDate: new Date("2026-04-30T23:59:00Z"),
    yesPool: 9500,
    noPool: 500,
    volume: 4500,
    traderCount: 178,
  },
  {
    title: "Jack Smith Mart sonuna kadar suclanir mi?",
    description: "Eski Ozel Savci Jack Smith 31 Mart 2026'ya kadar federal suclamalarla karsi karsiya kalirsa EVET. Polymarket'te de aktif olarak isleniyor.",
    titleEn: "Will Jack Smith be charged by March 31?",
    category: "DUNYA",
    slug: "jack-smith-suclama-mart-2026",
    resolutionDate: new Date("2026-03-31T23:59:00Z"),
    yesPool: 6500,
    noPool: 3500,
    volume: 9200,
    traderCount: 389,
  },

  // === KRIPTO & TEKNOLOJI ===
  {
    title: "Bitcoin Mart sonunda $80,000 uzerinde mi?",
    description: "BTC/USD fiyati 31 Mart 2026 gunu $80,000 ve uzerindeyse EVET. CoinGecko verisi baz alinir. Mart ayinda $35.9M islem hacmi olan Polymarket marketi.",
    titleEn: "Will Bitcoin be above $80K at end of March?",
    category: "TEKNOLOJI",
    slug: "bitcoin-80k-mart-sonu-2026",
    resolutionDate: new Date("2026-03-31T23:59:00Z"),
    yesPool: 5000,
    noPool: 5000,
    volume: 14200,
    traderCount: 567,
  },
  {
    title: "Nasdaq 7/24 islem saatine Haziran sonuna kadar gecer mi?",
    description: "Nasdaq borsasi 30 Haziran 2026'ya kadar 7 gun 24 saat islem saatlerini resmi olarak baslatirsa EVET. Polymarket'te trending market.",
    titleEn: "Will Nasdaq launch round-the-clock trading by June 30?",
    category: "TEKNOLOJI",
    slug: "nasdaq-7-24-islem-haziran-2026",
    resolutionDate: new Date("2026-06-30T23:59:00Z"),
    yesPool: 4500,
    noPool: 5500,
    volume: 6700,
    traderCount: 234,
  },
  {
    title: "Robinhood tahmin piyasasi Mart sonuna kadar acar mi?",
    description: "Robinhood MIAXdx uzerinden tahmin piyasasini 31 Mart 2026'ya kadar baslatirsa EVET. Polymarket'te aktif olarak isleniyor.",
    titleEn: "Will Robinhood launch prediction market by March 31?",
    category: "TEKNOLOJI",
    slug: "robinhood-tahmin-piyasasi-mart-2026",
    resolutionDate: new Date("2026-03-31T23:59:00Z"),
    yesPool: 5500,
    noPool: 4500,
    volume: 5100,
    traderCount: 198,
  },

  // === TURKIYE — ONUMUZDEKI HAFTA (16-21 Mart) ===
  {
    title: "Dolar/TL 21 Mart Cuma kapanisi 44 TL uzerinde mi?",
    description: "USD/TRY paritesi 21 Mart 2026 Cuma gunu TCMB kapanisinda 44.00 ve uzerindeyse EVET. TCMB faizi %37'de sabit tuttu, Iran gerginligi TL uzerinde baski yaratiyor.",
    titleEn: "Will USD/TRY close above 44 on Friday March 21?",
    category: "EKONOMI",
    slug: "dolar-tl-44-21-mart-2026",
    resolutionDate: new Date("2026-03-21T17:00:00Z"),
    yesPool: 5000,
    noPool: 5000,
    volume: 4300,
    traderCount: 156,
  },
  {
    title: "TUIK Ocak sanayi uretimi artisi %3 uzerinde mi?",
    description: "TUIK'in onumuzdeki hafta aciklayacagi Ocak 2026 sanayi uretim endeksi yillik artisi %3.0 ve uzerindeyse EVET.",
    titleEn: "Will Turkey's January industrial production growth exceed 3%?",
    category: "EKONOMI",
    slug: "tuik-sanayi-uretim-ocak-2026",
    resolutionDate: new Date("2026-03-19T12:00:00Z"),
    yesPool: 4500,
    noPool: 5500,
    volume: 1200,
    traderCount: 43,
  },
  {
    title: "Turkiye Iran savasi nedeniyle OHAL ilan eder mi? (Mart sonu)",
    description: "Turkiye Mart 2026 sonuna kadar Iran savasiyla baglantili olarak Olaganustu Hal ilan ederse EVET. Erdogan 'siddeti onlemek icin yogun diplomasi yurutuyoruz' dedi.",
    titleEn: "Will Turkey declare state of emergency due to Iran war by end of March?",
    category: "SIYASET",
    slug: "turkiye-ohal-iran-mart-2026",
    resolutionDate: new Date("2026-03-31T23:59:00Z"),
    yesPool: 9000,
    noPool: 1000,
    volume: 6700,
    traderCount: 278,
  },
  {
    title: "TCMB Nisan toplantisinda faiz indirir mi?",
    description: "TCMB Nisan 2026 PPK toplantisinda politika faizini %37'nin altina indirirse EVET. Mart'ta sabit tuttu, enflasyon hedefi %16.",
    titleEn: "Will CBRT cut rates at the April 2026 meeting?",
    category: "EKONOMI",
    slug: "tcmb-nisan-faiz-indirimi-2026",
    resolutionDate: new Date("2026-04-17T14:00:00Z"),
    yesPool: 5500,
    noPool: 4500,
    volume: 3800,
    traderCount: 134,
  },
  {
    title: "18 Mart Canakkale toreninde Erdogan-muhalefet gorusmesi olur mu?",
    description: "18 Mart 2026 Canakkale Zaferi torenlerinde Cumhurbaskani Erdogan ile ana muhalefet lideri arasinda resmi gorusme veya tokalasmali karsilasma olursa EVET.",
    titleEn: "Will Erdogan meet with opposition leader at Canakkale ceremony on March 18?",
    category: "SIYASET",
    slug: "erdogan-muhalefet-canakkale-18-mart-2026",
    resolutionDate: new Date("2026-03-18T23:59:00Z"),
    yesPool: 7500,
    noPool: 2500,
    volume: 2100,
    traderCount: 89,
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

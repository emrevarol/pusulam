import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE_URL = "https://pusulam.ai";
const LOCALES = ["tr", "en", "de", "es", "fr", "ar", "pt", "rw", "sw", "am"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const markets = await prisma.market.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const staticPages = ["", "/piyasalar", "/skor", "/kullanicilar", "/asistan", "/giris", "/kayit"];

  const staticEntries = LOCALES.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${BASE_URL}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: page === "" ? "daily" as const : "weekly" as const,
      priority: page === "" ? 1 : 0.8,
    }))
  );

  const marketEntries = LOCALES.flatMap((locale) =>
    markets.map((market) => ({
      url: `${BASE_URL}/${locale}/piyasalar/${market.slug}`,
      lastModified: market.updatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    }))
  );

  return [...staticEntries, ...marketEntries];
}

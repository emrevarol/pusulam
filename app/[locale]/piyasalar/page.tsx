import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { MarketCard } from "@/components/market-card";
import { CategoryFilter } from "@/components/category-filter";
import { SortFilter } from "@/components/sort-filter";
import { StatusFilter } from "@/components/status-filter";
import { MarketSearch } from "@/components/market-search";
import { CountryFilter } from "@/components/country-filter";

type SortOption = "closing" | "newest" | "popular" | "forecasters";

const ORDER_BY: Record<SortOption, Record<string, string>> = {
  closing: { resolutionDate: "asc" },
  newest: { createdAt: "desc" },
  popular: { volume: "desc" },
  forecasters: { traderCount: "desc" },
};

async function closeExpiredMarkets() {
  const result = await prisma.market.updateMany({
    where: {
      status: "OPEN",
      resolutionDate: { lte: new Date() },
    },
    data: { status: "CLOSED" },
  });

  if (result.count > 0) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/cron/resolve-markets`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {});
  }
}

async function getMarkets(category?: string, sort?: string, statusFilter?: string, query?: string, country?: string) {
  await closeExpiredMarkets();

  const statusWhere =
    statusFilter === "resolved"
      ? { status: "RESOLVED" }
      : statusFilter === "all"
        ? {}
        : { status: "OPEN" };

  const searchWhere = query
    ? {
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const categoryWhere = category && category !== "all" ? { category } : {};

  // Country filter: show user's country markets + GLOBAL
  const countryWhere = country && country !== "all"
    ? { country: { in: [country, "GLOBAL"] } }
    : {};

  const where = { ...categoryWhere, ...statusWhere, ...searchWhere, ...countryWhere };

  const defaultSort = statusFilter === "resolved" ? "newest" : (sort || "newest");
  const orderBy = ORDER_BY[(defaultSort as SortOption)] || ORDER_BY.newest;

  const markets = await prisma.market.findMany({
    where,
    orderBy,
  });

  return markets.map((m) => ({
    ...m,
    titleTranslations: m.titleTranslations as Record<string, string> | null,
    descriptionTranslations: m.descriptionTranslations as Record<string, string> | null,
    resolutionDate: m.resolutionDate.toISOString(),
    resolvedAt: m.resolvedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));
}

export default async function MarketsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kategori?: string; sirala?: string; durum?: string; q?: string; ulke?: string }>;
}) {
  const { locale } = await params;
  const { kategori, sirala, durum, q, ulke } = await searchParams;
  // Default country from locale
  const defaultCountry = locale === "de" ? "DE" : locale === "fr" ? "FR" : locale === "pt" ? "BR" : locale === "es" ? "ES" : locale === "ar" ? "EG" : locale === "en" ? "GB" : "TR";
  const markets = await getMarkets(kategori, sirala, durum, q, ulke || defaultCountry);
  const t = await getTranslations({ locale, namespace: "market" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Search + Status */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MarketSearch />
        <StatusFilter activeStatus={durum} />
      </div>

      {/* Country filter */}
      <div className="mb-4">
        <CountryFilter activeCountry={ulke || defaultCountry} />
      </div>

      {/* Category + Sort */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <CategoryFilter activeCategory={kategori} />
        <SortFilter />
      </div>

      {/* Search result info */}
      {q && (
        <p className="mb-4 text-sm text-gray-500">
          &ldquo;{q}&rdquo; icin {markets.length} sonuc
        </p>
      )}

      {markets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center dark:border-gray-800">
          <p className="text-gray-400">
            {q ? `"${q}" ile eslesen piyasa bulunamadi.` : t("noMarkets")}
          </p>
        </div>
      )}
    </div>
  );
}

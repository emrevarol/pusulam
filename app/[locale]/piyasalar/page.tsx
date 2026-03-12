import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { MarketCard } from "@/components/market-card";
import { CategoryFilter } from "@/components/category-filter";
import { SortFilter } from "@/components/sort-filter";

type SortOption = "closing" | "newest" | "popular" | "forecasters";

const ORDER_BY: Record<SortOption, Record<string, string>> = {
  closing: { resolutionDate: "asc" },
  newest: { createdAt: "desc" },
  popular: { volume: "desc" },
  forecasters: { traderCount: "desc" },
};

async function closeExpiredMarkets() {
  await prisma.market.updateMany({
    where: {
      status: "OPEN",
      resolutionDate: { lte: new Date() },
    },
    data: { status: "CLOSED" },
  });
}

async function getMarkets(category?: string, sort?: string) {
  // Auto-close expired markets on every page load
  await closeExpiredMarkets();

  const where = category && category !== "all"
    ? { category, status: "OPEN" }
    : { status: "OPEN" };

  const orderBy = ORDER_BY[(sort as SortOption)] || ORDER_BY.newest;

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
  searchParams: Promise<{ kategori?: string; sirala?: string }>;
}) {
  const { locale } = await params;
  const { kategori, sirala } = await searchParams;
  const markets = await getMarkets(kategori, sirala);
  const t = await getTranslations({ locale, namespace: "market" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <CategoryFilter activeCategory={kategori} />
        <SortFilter />
      </div>

      {markets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center dark:border-gray-800">
          <p className="text-gray-400">{t("noMarkets")}</p>
        </div>
      )}
    </div>
  );
}

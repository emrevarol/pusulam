import { useTranslations } from "next-intl";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { MarketCard } from "@/components/market-card";

async function getMarkets() {
  const markets = await prisma.market.findMany({
    where: { status: "OPEN" },
    orderBy: { volume: "desc" },
    take: 6,
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

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const markets = await getMarkets();

  return <HomeContent locale={locale} markets={markets} />;
}

function HomeContent({
  locale,
  markets,
}: {
  locale: string;
  markets: Awaited<ReturnType<typeof getMarkets>>;
}) {
  const t = useTranslations("home");
  const tc = useTranslations("common");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 px-4 py-24 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            🧭 {t("hero")}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-teal-100">
            {t("heroSub")}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href={`/${locale}/piyasalar`}
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-700 shadow-lg transition hover:bg-teal-50 dark:bg-gray-800 dark:text-teal-400"
            >
              {t("startTrading")}
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t("howItWorks")}
            </a>
          </div>
        </div>
      </section>

      {/* Popular Markets */}
      <section className="mx-auto max-w-6xl px-4 py-16 dark:bg-gray-950">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t("popular")}</h2>
          <Link
            href={`/${locale}/piyasalar`}
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            {t("viewAll")} →
          </Link>
        </div>

        {markets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center dark:border-gray-800">
            <p className="text-lg text-gray-400">
              {locale === "tr"
                ? "Henüz piyasa oluşturulmadı. İlk piyasayı sen oluştur!"
                : "No markets yet. Be the first to create one!"}
            </p>
          </div>
        )}
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-t border-gray-200 bg-white px-4 py-16 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold">
            {t("howItWorks")}
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                { step: "1", icon: "👤", title: t("step1Title"), desc: t("step1Desc") },
                { step: "2", icon: "🔍", title: t("step2Title"), desc: t("step2Desc") },
                { step: "3", icon: "📈", title: t("step3Title"), desc: t("step3Desc") },
                { step: "4", icon: "🏆", title: t("step4Title"), desc: t("step4Desc") },
              ] as const
            ).map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-2xl dark:bg-teal-900/20">
                  {item.icon}
                </div>
                <h3 className="mb-2 text-sm font-bold">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

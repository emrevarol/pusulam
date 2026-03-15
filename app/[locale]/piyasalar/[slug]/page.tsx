import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getYesPrice, getNoPrice } from "@/lib/amm";
import { getTranslations } from "next-intl/server";
import { TradePanel } from "@/components/trade-panel";
import { CommentSection } from "@/components/comment-section";
import { Countdown } from "@/components/countdown";
import { ShareButtons } from "@/components/share-buttons";
import { AskAiButton } from "@/components/ask-ai-button";
import { ResolveMarketButton } from "@/components/resolve-market-button";
import { HaltMarketButton } from "@/components/halt-market-button";
import { CATEGORIES, getLocalizedField, formatDate } from "@/lib/helpers";
import { PriceChart } from "@/components/price-chart";

async function getMarket(slug: string) {
  // Auto-close this market if expired
  const closed = await prisma.market.updateMany({
    where: {
      slug,
      status: "OPEN",
      resolutionDate: { lte: new Date() },
    },
    data: { status: "CLOSED" },
  });

  // Trigger AI resolution in the background if just closed
  if (closed.count > 0) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/cron/resolve-markets`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {});
  }

  const market = await prisma.market.findUnique({
    where: { slug },
    include: {
      createdBy: { select: { displayName: true, username: true } },
      comments: {
        include: {
          user: { select: { displayName: true, username: true } },
          votes: { select: { userId: true, value: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { trades: true } },
    },
  });
  return market;
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const market = await getMarket(slug);
  const session = await getServerSession(authOptions);
  const t = await getTranslations({ locale, namespace: "market" });

  if (!market) notFound();

  const yesPrice = getYesPrice(market.yesPool, market.noPool);
  const noPrice = getNoPrice(market.yesPool, market.noPool);
  const cat = CATEGORIES[market.category];

  const isOpen = market.status === "OPEN";
  const isResolved = market.status === "RESOLVED";
  const isHalted = market.status === "HALTED";
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";
  const yesPct = (yesPrice * 100).toFixed(1);
  const noPct = (noPrice * 100).toFixed(1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="mb-6">
            {cat && (
              <span className="mb-2 inline-block text-sm text-gray-500">
                {cat.emoji} {cat.label}
              </span>
            )}
            <h1 className="mb-3 text-2xl font-bold">
              {getLocalizedField(market.title, market.titleTranslations as Record<string, string> | null, locale)}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {getLocalizedField(market.description, market.descriptionTranslations as Record<string, string> | null, locale)}
            </p>
          </div>

          {/* Resolved banner */}
          {isResolved && (
            <div className={`mb-6 rounded-xl border-2 p-4 text-center ${
              market.resolvedOutcome === "YES"
                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                : "border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-900/20"
            }`}>
              <p className="text-lg font-bold">
                {t("result")}: {market.resolvedOutcome === "YES" ? t("resolvedYes") : t("resolvedNo")}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t("resolvedPayoutsDistributed")}
              </p>
            </div>
          )}

          {isHalted && (
            <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-center dark:border-amber-700 dark:bg-amber-900/20">
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                ⚠️ {t("marketHalted")}
              </p>
              {market.haltReason && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {market.haltReason}
                </p>
              )}
            </div>
          )}

          {/* Probability bar */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {t("yesProbability")}
                </p>
                <p className="text-4xl font-bold text-emerald-600">%{yesPct}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {t("noProbability")}
                </p>
                <p className="text-4xl font-bold text-rose-500">%{noPct}</p>
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-rose-100 dark:bg-rose-900/30">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${yesPct}%` }}
              />
            </div>
          </div>

          {/* Stats + Dates */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500">
                {t("volume")}
              </p>
              <p className="text-lg font-bold">
                {market.volume.toLocaleString("tr-TR")} P
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500">
                {t("trades")}
              </p>
              <p className="text-lg font-bold">{market._count.trades}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500">
                {t("forecasters")}
              </p>
              <p className="text-lg font-bold">{market.traderCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500">
                {t("createdAt")}
              </p>
              <p className="text-sm font-semibold">{formatDate(market.createdAt)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-1 text-xs text-gray-500">
                {t("ends")}
              </p>
              <Countdown
                targetDate={market.resolutionDate.toISOString()}
                locale={locale}
                compact
              />
            </div>
            {isResolved && market.resolvedAt && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs text-gray-500">
                  {t("resolvedAt")}
                </p>
                <p className="text-sm font-semibold">{formatDate(market.resolvedAt)}</p>
              </div>
            )}
          </div>

          {/* Full countdown */}
          {isOpen && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                {t("timeUntilResolution")}
              </p>
              <Countdown
                targetDate={market.resolutionDate.toISOString()}
                locale={locale}
              />
            </div>
          )}

          {/* Price history chart */}
          <div className="mb-6">
            <PriceChart
              marketId={market.id}
              currentProbability={yesPrice}
              createdAt={market.createdAt.toISOString()}
            />
          </div>

          {/* Share buttons */}
          <div className="mb-6">
            <ShareButtons
              title={market.title}
              yesPct={yesPct}
              slug={market.slug}
              locale={locale}
            />
          </div>

          {/* Comments */}
          <CommentSection
            marketId={market.id}
            currentUserId={session?.user?.id}
            comments={market.comments.map((c) => ({
              id: c.id,
              content: c.content,
              createdAt: c.createdAt.toISOString(),
              user: c.user,
              votes: c.votes,
            }))}
          />
        </div>

        {/* Trade sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {isOpen ? (
            <TradePanel
              marketId={market.id}
              yesPool={market.yesPool}
              noPool={market.noPool}
            />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="font-medium text-gray-500">
                {market.status === "RESOLVED"
                  ? `${t("result")}: ${market.resolvedOutcome}`
                  : market.status === "HALTED"
                    ? t("marketHalted")
                    : t("marketClosed")}
              </p>
            </div>
          )}

          {/* Admin resolve button */}
          {isAdmin && !isResolved && (
            <ResolveMarketButton
              marketId={market.id}
              status={market.status}
            />
          )}

          {/* Admin halt button */}
          {isAdmin && market.status === "OPEN" && (
            <HaltMarketButton
              marketId={market.id}
              status={market.status}
            />
          )}

          {/* Ask AI button */}
          <AskAiButton
            marketId={market.id}
            marketTitle={market.title}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}

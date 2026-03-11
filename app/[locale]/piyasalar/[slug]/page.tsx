import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getYesPrice, getNoPrice } from "@/lib/amm";
import { TradePanel } from "@/components/trade-panel";
import { CommentSection } from "@/components/comment-section";
import { Countdown } from "@/components/countdown";
import { ShareButtons } from "@/components/share-buttons";
import { CATEGORIES } from "@/lib/helpers";

async function getMarket(slug: string) {
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

  if (!market) notFound();

  const yesPrice = getYesPrice(market.yesPool, market.noPool);
  const noPrice = getNoPrice(market.yesPool, market.noPool);
  const cat = CATEGORIES[market.category];

  const isOpen = market.status === "OPEN";
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
            <h1 className="mb-3 text-2xl font-bold">{market.title}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {market.description}
            </p>
          </div>

          {/* Probability bar */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {locale === "tr" ? "Evet Olasiligi" : "Yes Probability"}
                </p>
                <p className="text-4xl font-bold text-emerald-600">%{yesPct}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {locale === "tr" ? "Hayir Olasiligi" : "No Probability"}
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

          {/* Stats + Countdown */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500">
                {locale === "tr" ? "Hacim" : "Volume"}
              </p>
              <p className="text-lg font-bold">
                {market.volume.toLocaleString("tr-TR")} K
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500">
                {locale === "tr" ? "Islem" : "Trades"}
              </p>
              <p className="text-lg font-bold">{market._count.trades}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500">
                {locale === "tr" ? "Tahminci" : "Forecasters"}
              </p>
              <p className="text-lg font-bold">{market.traderCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-1 text-xs text-gray-500">
                {locale === "tr" ? "Bitis" : "Ends"}
              </p>
              <Countdown
                targetDate={market.resolutionDate.toISOString()}
                locale={locale}
                compact
              />
            </div>
          </div>

          {/* Full countdown */}
          {isOpen && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                {locale === "tr" ? "Cozulmeye Kalan Sure" : "Time Until Resolution"}
              </p>
              <Countdown
                targetDate={market.resolutionDate.toISOString()}
                locale={locale}
              />
            </div>
          )}

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
        <div className="lg:col-span-1">
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
                  ? `${locale === "tr" ? "Sonuc" : "Result"}: ${market.resolvedOutcome}`
                  : locale === "tr"
                    ? "Bu piyasa kapandi."
                    : "This market is closed."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

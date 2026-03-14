"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

interface ActivityItem {
  type: "trade" | "comment";
  id: string;
  user: { id: string; displayName: string; username: string };
  market: { id: string; title: string; slug: string; category: string };
  data: Record<string, string | number>;
  createdAt: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  EKONOMI: "💰",
  SIYASET: "🏛️",
  TEKNOLOJI: "💻",
  GUNDEM: "📰",
  DUNYA: "🌍",
  EGITIM: "📚",
};

export default function ActivityFeedPage() {
  const t = useTranslations("activity");
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "tr";

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [feed, setFeed] = useState<"friends" | "global">("friends");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchActivities = useCallback(
    async (reset = false) => {
      if (!session?.user) return;
      setLoading(true);

      const params = new URLSearchParams({ feed, limit: "30" });
      if (!reset && cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();

      if (reset) {
        setActivities(data.activities || []);
      } else {
        setActivities((prev) => [...prev, ...(data.activities || [])]);
      }
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor && (data.activities?.length || 0) > 0);
      setLoading(false);
    },
    [session, feed, cursor]
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/giris`);
      return;
    }
    if (!session?.user) return;
    setCursor(null);
    fetchActivities(true);
  }, [session, status, feed, locale, router]);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Az once";
    if (mins < 60) return `${mins}dk`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}s`;
    const days = Math.floor(hrs / 24);
    return `${days}g`;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {/* Feed tabs */}
      <div className="mb-6 flex gap-2">
        {(["friends", "global"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFeed(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              feed === f
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {t(f)}
          </button>
        ))}
      </div>

      {loading && activities.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Yukleniyor...</p>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">{t("noActivity")}</p>
          {feed === "friends" && (
            <Link
              href={`/${locale}/kullanicilar`}
              className="text-teal-600 hover:underline"
            >
              Arkadas bul ve takip et
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <Link
                  href={`/${locale}/kullanici/${item.user.username}`}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600 dark:bg-teal-900/30"
                >
                  {item.user.displayName.charAt(0).toUpperCase()}
                </Link>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <p className="text-sm">
                    <Link
                      href={`/${locale}/kullanici/${item.user.username}`}
                      className="font-semibold text-gray-900 hover:text-teal-600 dark:text-gray-100"
                    >
                      {item.user.displayName}
                    </Link>
                    <span className="text-gray-500">
                      {" "}
                      {item.type === "trade"
                        ? `${(item.data.direction as string) === "BUY" ? t("bought") : t("sold")} `
                        : `${t("commented")} `}
                    </span>
                    {item.type === "trade" && (
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${
                          item.data.side === "YES"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}
                      >
                        {item.data.side as string}
                      </span>
                    )}
                  </p>

                  {/* Market link */}
                  <Link
                    href={`/${locale}/piyasalar/${item.market.slug}`}
                    className="mt-1 block text-sm text-gray-700 hover:text-teal-600 dark:text-gray-300"
                  >
                    {CATEGORY_EMOJI[item.market.category] || "📌"}{" "}
                    {item.market.title}
                  </Link>

                  {/* Comment preview */}
                  {item.type === "comment" && item.data.content && (
                    <p className="mt-1 text-sm text-gray-500 italic">
                      &ldquo;{item.data.content as string}&rdquo;
                    </p>
                  )}
                </div>

                {/* Time */}
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {timeAgo(item.createdAt)}
                </span>
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => fetchActivities(false)}
              disabled={loading}
              className="w-full rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {loading ? "Yukleniyor..." : "Daha fazla"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

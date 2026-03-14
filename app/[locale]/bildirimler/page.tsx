"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  FRIEND_REQUEST: "👥",
  FRIEND_ACCEPTED: "🤝",
  MARKET_RESOLVED: "📊",
  COMMENT_REPLY: "💬",
  BADGE_EARNED: "🏅",
  PAYOUT: "💰",
};

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "tr";

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/giris`);
      return;
    }
    if (!session?.user) return;

    setLoading(true);
    fetch(`/api/notifications?unread=${filter === "unread"}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || []);
      })
      .finally(() => setLoading(false));
  }, [session, status, filter, locale, router]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [id] }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function handleClick(n: Notification) {
    if (!n.read) markRead(n.id);
    if (n.link) router.push(`/${locale}${n.link}`);
  }

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button
          onClick={markAllRead}
          className="text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400"
        >
          {t("markAllRead")}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {t(f)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">Yukleniyor...</p>
      ) : notifications.length === 0 ? (
        <p className="text-center text-gray-500 py-12">{t("noNotifications")}</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition hover:shadow-sm ${
                n.read
                  ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  : "border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-900/10"
              }`}
            >
              <span className="mt-0.5 text-xl">
                {TYPE_ICONS[n.type] || "📌"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-teal-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {n.body}
                </p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {timeAgo(n.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

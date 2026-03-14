"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  username: string;
  oyHakki: number;
  _count: { trades: number };
}

export default function LeaderboardPage() {
  const t = useTranslations("common");
  const tl = useTranslations("leaderboard");
  const { data: session } = useSession();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "tr";

  const [tab, setTab] = useState<"global" | "friends">("global");
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?type=${tab}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setUsers([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setUsers([]);
        setLoading(false);
      });
  }, [tab]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{tl("title")}</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        <button
          onClick={() => setTab("global")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            tab === "global"
              ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          {tl("global")}
        </button>
        <button
          onClick={() => {
            if (session?.user) setTab("friends");
          }}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
            tab === "friends"
              ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          } ${!session?.user ? "cursor-not-allowed opacity-50" : ""}`}
        >
          {tl("friends")}
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-gray-400">{t("loading")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                user.rank <= 3
                  ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-900/10"
                  : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <span className="w-8 text-center text-lg font-bold">
                {user.rank <= 3 ? medals[user.rank - 1] : `#${user.rank}`}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600 dark:bg-teal-900/30">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{user.displayName}</p>
                <p className="text-xs text-gray-500">
                  @{user.username} · {user._count.trades} {tl("trades")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">
                  {user.oyHakki.toLocaleString("tr-TR", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  {tl("oyHakki")}
                </p>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
              {tab === "friends" ? (
                <>
                  <p className="mb-4 text-gray-400">{tl("noFriends")}</p>
                  <Link
                    href={`/${locale}/kullanicilar`}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    {tl("findFriends")}
                  </Link>
                </>
              ) : (
                <p className="text-gray-400">{tl("noUsers")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

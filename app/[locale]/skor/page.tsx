"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "tr";

  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">{t("loading")}</p>
      </div>
    );
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">
        {tl("title")}
      </h1>

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
                @{user.username} · {user._count.trades}{" "}
                {tl("trades")}
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
            <p className="text-gray-400">
              {tl("noUsers")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

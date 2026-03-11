"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/helpers";

interface Position {
  id: string;
  side: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  market: {
    title: string;
    slug: string;
    status: string;
    category: string;
    resolvedOutcome: string | null;
  };
}

interface Trade {
  id: string;
  direction: string;
  side: string;
  shares: number;
  price: number;
  cost: number;
  createdAt: string;
  market: { title: string; slug: string; category: string };
}

export default function ProfilePage() {
  const t = useTranslations("common");
  const tm = useTranslations("market");
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "tr";

  const [balance, setBalance] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tab, setTab] = useState<"positions" | "history">("positions");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/giris`);
      return;
    }
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/user/balance").then((r) => r.json()),
        fetch("/api/user/positions").then((r) => r.json()),
        fetch("/api/user/trades").then((r) => r.json()),
      ]).then(([balData, posData, tradeData]) => {
        setBalance(balData.balance);
        setPositions(posData);
        setTrades(tradeData);
        setLoading(false);
      });
    }
  }, [status, locale, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">{t("loading")}</p>
      </div>
    );
  }

  if (!session) return null;

  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* User header */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-600 dark:bg-teal-900/30">
            {session.user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{session.user.name}</h1>
            <p className="text-sm text-gray-500">@{session.user.username}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
            <p className="text-xs text-gray-500">{t("balance")}</p>
            <p className="text-xl font-bold text-emerald-600">
              {balance.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} K
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
            <p className="text-xs text-gray-500">
              {locale === "tr" ? "Portfoy Degeri" : "Portfolio Value"}
            </p>
            <p className="text-xl font-bold">
              {totalValue.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} K
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
            <p className="text-xs text-gray-500">
              {locale === "tr" ? "Kar/Zarar" : "P&L"}
            </p>
            <p
              className={`text-xl font-bold ${
                totalPnl >= 0 ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {totalPnl >= 0 ? "+" : ""}
              {totalPnl.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} K
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("positions")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "positions"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {tm("yourPosition")} ({positions.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "history"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {locale === "tr" ? "Islem Gecmisi" : "Trade History"} ({trades.length})
        </button>
      </div>

      {/* Positions tab */}
      {tab === "positions" && (
        <div className="space-y-3">
          {positions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
              <p className="text-gray-400">{tm("noPosition")}</p>
              <Link
                href={`/${locale}/piyasalar`}
                className="mt-3 inline-block text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                {locale === "tr" ? "Piyasalari Kesfet" : "Explore Markets"} →
              </Link>
            </div>
          ) : (
            positions.map((pos) => {
              const cat = CATEGORIES[pos.market.category];
              return (
                <Link
                  key={pos.id}
                  href={`/${locale}/piyasalar/${pos.market.slug}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {cat && (
                          <span className="text-xs text-gray-500">
                            {cat.emoji} {cat.label}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            pos.side === "YES"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-900/30"
                          }`}
                        >
                          {pos.side === "YES" ? tm("yesShares") : tm("noShares")}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold">{pos.market.title}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {pos.shares.toFixed(0)} {tm("shares").toLowerCase()}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          pos.pnl >= 0 ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {pos.pnl >= 0 ? "+" : ""}
                        {pos.pnl.toFixed(1)} K
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Trade history tab */}
      {tab === "history" && (
        <div className="space-y-2">
          {trades.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
              <p className="text-gray-400">
                {locale === "tr" ? "Henuz islem yapmadiniz." : "No trades yet."}
              </p>
            </div>
          ) : (
            trades.map((trade) => (
              <Link
                key={trade.id}
                href={`/${locale}/piyasalar/${trade.market.slug}`}
                className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
              >
                <span
                  className={`rounded-md px-2 py-1 text-xs font-bold ${
                    trade.direction === "BUY"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-900/30"
                  }`}
                >
                  {trade.direction === "BUY" ? tm("buy") : tm("sell")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {trade.market.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {trade.shares.toFixed(0)} {trade.side === "YES" ? tm("yesShares") : tm("noShares")}
                    {" · "}
                    {new Date(trade.createdAt).toLocaleDateString(
                      locale === "tr" ? "tr-TR" : "en-US",
                      { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {trade.direction === "BUY" ? "-" : "+"}
                  {trade.cost.toFixed(1)} K
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

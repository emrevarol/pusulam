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

interface MySuggestion {
  id: string;
  titleTr: string;
  category: string;
  suggestedDate: string;
  status: string;
  rejectReason: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const t = useTranslations("common");
  const tm = useTranslations("market");
  const tp = useTranslations("profile");
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "tr";

  const [oyHakki, setOyHakki] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [suggestions, setSuggestions] = useState<MySuggestion[]>([]);
  const [tab, setTab] = useState<"positions" | "past" | "history" | "suggestions">("positions");
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
        fetch("/api/user/suggestions").then((r) => r.json()),
      ]).then(([balData, posData, tradeData, sugData]) => {
        setOyHakki(balData.oyHakki ?? 0);
        setPositions(posData);
        setTrades(tradeData);
        setSuggestions(Array.isArray(sugData) ? sugData : []);
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

  const activePositions = positions.filter((p) => p.market.status !== "RESOLVED");
  const pastPositions = positions.filter((p) => p.market.status === "RESOLVED");
  const totalValue = activePositions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const pastWins = pastPositions.filter((p) => p.side === p.market.resolvedOutcome).length;
  const pastLosses = pastPositions.length - pastWins;

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
            <p className="text-xs text-gray-500">{t("oyHakki")}</p>
            <p className="text-xl font-bold text-emerald-600">
              {oyHakki}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
            <p className="text-xs text-gray-500">
              {tp("portfolioValue")}
            </p>
            <p className="text-xl font-bold">
              {totalValue.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
            <p className="text-xs text-gray-500">
              {tp("pnl")}
            </p>
            <p
              className={`text-xl font-bold ${
                totalPnl >= 0 ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {totalPnl >= 0 ? "+" : ""}
              {totalPnl.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}
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
          {tm("yourPosition")} ({activePositions.length})
        </button>
        <button
          onClick={() => setTab("past")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "past"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {tp("pastPredictions")} ({pastPositions.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "history"
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {tp("voteHistory")} ({trades.length})
        </button>
        {suggestions.length > 0 && (
          <button
            onClick={() => setTab("suggestions")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "suggestions"
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {tp("mySuggestions")} ({suggestions.length})
          </button>
        )}
      </div>

      {/* Active Positions tab */}
      {tab === "positions" && (
        <div className="space-y-3">
          {activePositions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
              <p className="text-gray-400">{tm("noPosition")}</p>
              <Link
                href={`/${locale}/piyasalar`}
                className="mt-3 inline-block text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                {tp("exploreMarkets")} →
              </Link>
            </div>
          ) : (
            activePositions.map((pos) => {
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
                        {pos.shares.toFixed(1)} {tm("shares").toLowerCase()}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          pos.pnl >= 0 ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {pos.pnl >= 0 ? "+" : ""}
                        {pos.pnl.toFixed(1)} P
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Past Predictions tab */}
      {tab === "past" && (
        <div className="space-y-3">
          {/* Summary bar */}
          {pastPositions.length > 0 && (
            <div className="mb-2 flex items-center gap-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <span className="text-xs text-gray-500">{tp("totalPredictions")}: {pastPositions.length}</span>
              <span className="text-xs font-medium text-emerald-600">{tp("won")}: {pastWins}</span>
              <span className="text-xs font-medium text-rose-500">{tp("lost")}: {pastLosses}</span>
              {pastPositions.length > 0 && (
                <span className="text-xs font-medium text-teal-600">
                  {tp("accuracy")}: %{((pastWins / pastPositions.length) * 100).toFixed(0)}
                </span>
              )}
            </div>
          )}
          {pastPositions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
              <p className="text-gray-400">{tp("noPastPredictions")}</p>
            </div>
          ) : (
            pastPositions.map((pos) => {
              const cat = CATEGORIES[pos.market.category];
              const isWin = pos.side === pos.market.resolvedOutcome;
              const costBasis = pos.shares * pos.avgPrice;
              const payout = isWin ? pos.shares : 0;
              const profit = payout - costBasis;

              return (
                <Link
                  key={pos.id}
                  href={`/${locale}/piyasalar/${pos.market.slug}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
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
                          {pos.side === "YES" ? tm("yesShort") : tm("noShort")}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            isWin
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/40"
                          }`}
                        >
                          {isWin ? tp("won") : tp("lost")}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {tm("result")}: {pos.market.resolvedOutcome === "YES" ? tm("resolvedYes") : tm("resolvedNo")}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold">{pos.market.title}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {tp("invested")}: {costBasis.toFixed(1)} P · {pos.shares.toFixed(1)} {tm("shares").toLowerCase()} · {tm("avgPrice")}: %{(pos.avgPrice * 100).toFixed(0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          profit >= 0 ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {profit >= 0 ? "+" : ""}
                        {profit.toFixed(1)} P
                      </p>
                      {isWin && (
                        <p className="text-xs text-gray-500">
                          {tp("payout")}: {payout.toFixed(1)} P
                        </p>
                      )}
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
                {tp("noVotes")}
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
                      locale === "tr" ? "tr-TR" : locale,
                      { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {trade.direction === "BUY" ? "-" : "+"}
                  {trade.cost.toFixed(1)} P
                </span>
              </Link>
            ))
          )}
        </div>
      )}

      {/* My Suggestions tab */}
      {tab === "suggestions" && (
        <div className="space-y-3">
          {suggestions.map((s) => {
            const cat = CATEGORIES[s.category];
            return (
              <div
                key={s.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-1 flex items-center gap-2">
                  {cat && (
                    <span className="text-xs text-gray-500">
                      {cat.emoji} {cat.label}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      s.status === "PENDING"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30"
                        : s.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30"
                    }`}
                  >
                    {s.status === "PENDING"
                      ? tp("suggestionPending")
                      : s.status === "APPROVED"
                        ? tp("suggestionApproved")
                        : tp("suggestionRejected")}
                  </span>
                </div>
                <h3 className="text-sm font-semibold">{s.titleTr}</h3>
                <p className="mt-1 text-[10px] text-gray-400">
                  {tp("suggestedDate")}: {new Date(s.suggestedDate).toLocaleDateString("tr-TR")}
                  {" · "}
                  {new Date(s.createdAt).toLocaleDateString("tr-TR")}
                </p>
                {s.rejectReason && (
                  <p className="mt-1 text-xs text-rose-500">
                    {tp("rejectReason")}: {s.rejectReason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

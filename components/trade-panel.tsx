"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getYesPrice, getNoPrice, calculateBuyCost, calculateSellReturn } from "@/lib/amm";
import { DAILY_FREE_OY_HAKKI } from "@/lib/credits";

interface Position {
  id: string;
  side: string;
  shares: number;
  avgPrice: number;
}

interface TradePanelProps {
  marketId: string;
  yesPool: number;
  noPool: number;
}

export function TradePanel({ marketId, yesPool, noPool }: TradePanelProps) {
  const t = useTranslations("market");
  const tc = useTranslations("common");
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "tr";

  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [shares, setShares] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [dailyFree, setDailyFree] = useState(DAILY_FREE_OY_HAKKI);
  const [oyHakki, setOyHakki] = useState(0);

  const sharesNum = parseFloat(shares) || 0;

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/positions")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const slug = pathname.split("/").pop();
            setPositions(data.filter((p: { market: { slug: string } }) => p.market.slug === slug));
          }
        });
      fetch("/api/user/balance")
        .then((r) => r.json())
        .then((d) => {
          setOyHakki(d.oyHakki ?? 0);
          setDailyFree(d.dailyFreeRemaining ?? 0);
        });
    }
  }, [session, pathname]);

  let cost = 0;
  let avgPrice = 0;
  let returnAmount = 0;
  try {
    if (direction === "BUY" && sharesNum > 0) {
      const result = calculateBuyCost(yesPool, noPool, side, sharesNum);
      cost = result.cost;
      avgPrice = result.avgPrice;
    } else if (direction === "SELL" && sharesNum > 0) {
      const result = calculateSellReturn(yesPool, noPool, side, sharesNum);
      returnAmount = result.returnAmount;
    }
  } catch {
    cost = 0;
    avgPrice = 0;
    returnAmount = 0;
  }

  const yesPrice = getYesPrice(yesPool, noPool);
  const noPrice = getNoPrice(yesPool, noPool);
  const currentPosition = positions.find((p) => p.side === side);
  const isFree = dailyFree > 0;

  async function handleTrade() {
    if (!session) {
      router.push(`/${locale}/giris`);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, side, shares: sharesNum, direction }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "Yetersiz oy hakki") {
          setError(t("insufficientOyHakki"));
        } else {
          setError(data.error || tc("genericError"));
        }
        return;
      }

      setShares("");
      setSuccess(t("tradeSuccess"));
      setTimeout(() => setSuccess(""), 2000);
      window.dispatchEvent(new Event("trade-complete"));
      fetch("/api/user/positions")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const slug = pathname.split("/").pop();
            setPositions(data.filter((p: { market: { slug: string } }) => p.market.slug === slug));
          }
        });
      fetch("/api/user/balance")
        .then((r) => r.json())
        .then((d) => {
          setOyHakki(d.oyHakki ?? 0);
          setDailyFree(d.dailyFreeRemaining ?? 0);
        });
      router.refresh();
    } catch {
      setError(tc("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky top-20 space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-bold">{t("trade")}</h3>

        {/* Buy/Sell toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setDirection("BUY")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              direction === "BUY"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800"
            }`}
          >
            {t("buy")}
          </button>
          <button
            onClick={() => setDirection("SELL")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              direction === "SELL"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800"
            }`}
          >
            {t("sell")}
          </button>
        </div>

        {/* Side selector */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setSide("YES")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              side === "YES"
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {t("yesShares")} — %{(yesPrice * 100).toFixed(0)}
          </button>
          <button
            onClick={() => setSide("NO")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              side === "NO"
                ? "bg-rose-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {t("noShares")} — %{(noPrice * 100).toFixed(0)}
          </button>
        </div>

        {/* Shares (votes) input */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("shares")}
            {direction === "SELL" && currentPosition && (
              <span className="ml-1 text-gray-400">
                (max: {currentPosition.shares.toFixed(0)})
              </span>
            )}
          </label>
          <input
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="10"
            min="1"
            step="1"
            max={
              direction === "SELL" && currentPosition
                ? currentPosition.shares
                : undefined
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Cost breakdown */}
        {sharesNum > 0 && (
          <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            {direction === "BUY" ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{t("oyHakkiCost")}</span>
                  <span className="font-semibold">
                    {isFree ? t("freeVote") : `1 ${tc("oyHakki")}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{t("potentialReturn")}</span>
                  <span className="font-semibold text-emerald-600">
                    +{(sharesNum - cost).toFixed(1)} {tc("oyHakki")}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">{t("returnLabel")}</span>
                <span className="font-semibold text-emerald-600">
                  +{returnAmount.toFixed(1)} {tc("oyHakki")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Daily free info */}
        {session && direction === "BUY" && (
          <p className="mb-3 text-[10px] text-gray-400 dark:text-gray-500">
            {t("dailyFreeRemaining", { remaining: dailyFree, total: DAILY_FREE_OY_HAKKI })}
            {` · ${oyHakki} ${tc("oyHakki")}`}
          </p>
        )}

        {error && (
          <div className="mb-3">
            <p className="text-xs text-rose-500">{error}</p>
            {error.includes("oy hakki") && (
              <Link
                href={`/${locale}/kredi`}
                className="mt-1 inline-block text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                {t("buyOyHakkiLink")}
              </Link>
            )}
          </div>
        )}
        {success && (
          <p className="mb-3 text-xs text-emerald-500">{success}</p>
        )}

        <button
          onClick={handleTrade}
          disabled={loading || sharesNum <= 0}
          className={`w-full rounded-lg py-3 text-sm font-semibold text-white transition ${
            direction === "BUY"
              ? side === "YES"
                ? "bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300"
                : "bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300"
              : "bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-100"
          }`}
        >
          {loading
            ? "..."
            : session
              ? `${sharesNum || 0} ${side === "YES" ? t("yesShort") : t("noShort")} ${direction === "BUY" ? t("buy") : t("sell")}`
              : tc("loginRequired")}
        </button>
      </div>

      {/* User positions */}
      {session && positions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h4 className="mb-3 text-sm font-bold">{t("yourPosition")}</h4>
          <div className="space-y-2">
            {positions.map((pos) => {
              const curPrice = pos.side === "YES" ? yesPrice : noPrice;
              const value = pos.shares * curPrice;
              const costBasis = pos.shares * pos.avgPrice;
              const pnl = value - costBasis;

              return (
                <div
                  key={pos.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <div>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        pos.side === "YES"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30"
                      }`}
                    >
                      {pos.side}
                    </span>
                    <span className="ml-2 text-sm font-medium">
                      {pos.shares.toFixed(1)} {t("shares").toLowerCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xs font-medium ${
                        pnl >= 0 ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {pnl.toFixed(1)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

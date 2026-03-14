"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getYesPrice, getNoPrice, calculateBuyShares, calculateSellReturn } from "@/lib/amm";

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
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [oyHakki, setOyHakki] = useState(0);

  const amountNum = parseFloat(amount) || 0;

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
        });
    }
  }, [session, pathname]);

  // Calculate preview
  let sharesReceived = 0;
  let returnAmount = 0;
  try {
    if (direction === "BUY" && amountNum > 0) {
      const result = calculateBuyShares(yesPool, noPool, side, amountNum);
      sharesReceived = result.shares;
    } else if (direction === "SELL" && amountNum > 0) {
      const result = calculateSellReturn(yesPool, noPool, side, amountNum);
      returnAmount = result.returnAmount;
    }
  } catch {
    sharesReceived = 0;
    returnAmount = 0;
  }

  const yesPrice = getYesPrice(yesPool, noPool);
  const noPrice = getNoPrice(yesPool, noPool);
  const currentPosition = positions.find((p) => p.side === side);

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
        body: JSON.stringify({ marketId, side, amount: amountNum, direction }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error?.includes("Yetersiz") || data.error?.includes("INSUFFICIENT")) {
          setError(t("insufficientOyHakki"));
        } else {
          setError(data.error || tc("genericError"));
        }
        return;
      }

      setAmount("");
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

        {/* Amount input */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            {direction === "BUY"
              ? `${tc("oyHakki")} Miktari`
              : `${t("shares")} (max: ${currentPosition?.shares.toFixed(1) || 0})`}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={direction === "BUY" ? "5" : "10"}
            min="1"
            step="1"
            max={
              direction === "SELL" && currentPosition
                ? currentPosition.shares
                : direction === "BUY"
                  ? oyHakki
                  : undefined
            }
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          {/* Quick amount buttons for BUY */}
          {direction === "BUY" && oyHakki > 0 && (
            <div className="mt-2 flex gap-1.5">
              {[1, 3, 5, 10].filter(v => v <= oyHakki).map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {v}
                </button>
              ))}
              <button
                onClick={() => setAmount(String(oyHakki))}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Hepsi
              </button>
            </div>
          )}
        </div>

        {/* Cost breakdown */}
        {amountNum > 0 && (
          <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            {direction === "BUY" ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Harcanan</span>
                  <span className="font-semibold">{amountNum} {tc("oyHakki")}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Alinan Pay</span>
                  <span className="font-semibold">{sharesReceived.toFixed(1)} pay</span>
                </div>
                <div className="flex justify-between text-xs border-t border-gray-200 pt-2 dark:border-gray-700">
                  <span className="text-gray-500">{t("potentialReturn")}</span>
                  <span className="font-semibold text-emerald-600">
                    +{(sharesReceived - amountNum).toFixed(1)} {tc("oyHakki")}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Satilan</span>
                  <span className="font-semibold">{amountNum} pay</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{t("returnLabel")}</span>
                  <span className="font-semibold text-emerald-600">
                    +{returnAmount.toFixed(1)} {tc("oyHakki")}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Balance info */}
        {session && direction === "BUY" && (
          <p className="mb-3 text-[10px] text-gray-400 dark:text-gray-500">
            Bakiye: {oyHakki} {tc("oyHakki")}
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
          disabled={loading || amountNum <= 0 || (direction === "BUY" && amountNum > oyHakki)}
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
              ? direction === "BUY"
                ? `${amountNum || 0} ${tc("oyHakki")} ile ${side === "YES" ? t("yesShort") : t("noShort")} ${t("buy")}`
                : `${amountNum || 0} pay ${t("sell")}`
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
                      {pos.shares.toFixed(1)} pay
                    </span>
                    <span className="ml-1 text-xs text-gray-400">
                      (ort. %{(pos.avgPrice * 100).toFixed(0)})
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Kazanirsan: +{pos.shares.toFixed(1)}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        pnl >= 0 ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {pnl >= 0 ? "+" : ""}
                      {pnl.toFixed(1)} K/Z
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

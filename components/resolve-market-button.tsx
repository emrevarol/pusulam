"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export function ResolveMarketButton({
  marketId,
  status,
}: {
  marketId: string;
  status: string;
}) {
  const t = useTranslations("market");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState<"YES" | "NO" | null>(null);
  const [error, setError] = useState("");

  if (status === "RESOLVED") return null;

  async function resolve(outcome: "YES" | "NO") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/markets/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || tc("genericError"));
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError(tc("connectionError"));
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
      <p className="mb-3 text-center text-sm font-bold text-amber-800 dark:text-amber-300">
        {t("adminResolve")}
      </p>

      {error && (
        <p className="mb-3 text-center text-xs text-rose-500">{error}</p>
      )}

      {confirming ? (
        <div className="space-y-2">
          <p className="text-center text-sm text-gray-700 dark:text-gray-300">
            {t("confirmResolve", { outcome: confirming === "YES" ? tc("yes") : tc("no") })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => resolve(confirming)}
              disabled={loading}
              className={`flex-1 rounded-lg py-2 text-sm font-bold text-white disabled:opacity-50 ${
                confirming === "YES"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? "..." : tc("confirm")}
            </button>
            <button
              onClick={() => setConfirming(null)}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {tc("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming("YES")}
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            {t("resolveYes")}
          </button>
          <button
            onClick={() => setConfirming("NO")}
            className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
          >
            {t("resolveNo")}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function HaltMarketButton({ marketId, status }: { marketId: string; status: string }) {
  const t = useTranslations("market");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleHalt() {
    if (!reason.trim()) return;
    setLoading(true);
    const res = await fetch("/api/markets/halt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketId, reason }),
    });
    if (res.ok) {
      router.refresh();
    }
    setLoading(false);
  }

  if (status !== "OPEN") return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <h3 className="mb-2 text-sm font-bold text-amber-700 dark:text-amber-400">
        {t("haltMarket")}
      </h3>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          {t("haltButton")}
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("haltReasonPlaceholder")}
            className="w-full rounded-lg border border-amber-300 bg-white p-2 text-sm dark:border-amber-700 dark:bg-gray-900"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleHalt}
              disabled={loading || !reason.trim()}
              className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? "..." : t("confirmHalt")}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-gray-200 px-3 py-2 text-sm dark:bg-gray-700"
            >
              {t("cancelHalt")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

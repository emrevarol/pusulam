"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CREDIT_PACKAGES, DAILY_FREE_PREDICTIONS } from "@/lib/credits";

interface Purchase {
  id: string;
  amount: number;
  priceUsd: number;
  status: string;
  createdAt: string;
}

export default function CreditsPage() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = pathname.split("/")[1] || "tr";
  const isTr = locale === "tr";

  const [credits, setCredits] = useState(0);
  const [dailyRemaining, setDailyRemaining] = useState(DAILY_FREE_PREDICTIONS);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/giris`);
    }
    if (session?.user) {
      fetch("/api/user/balance")
        .then((r) => r.json())
        .then((d) => {
          setCredits(d.credits ?? 0);
          setDailyRemaining(d.dailyPredictionsRemaining ?? DAILY_FREE_PREDICTIONS);
        });
      fetch("/api/credits/history")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setPurchases(d);
        })
        .catch(() => {});
    }
  }, [status, session, locale, router]);

  const [error, setError] = useState("");

  async function buyPackage(packageId: string) {
    setLoading(packageId);
    setError("");
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Checkout failed");
        setLoading(null);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(isTr ? "Odeme baglantisi alinamadi." : "Could not get checkout link.");
        setLoading(null);
      }
    } catch {
      setError(isTr ? "Baglanti hatasi." : "Connection error.");
      setLoading(null);
    }
  }

  if (status === "loading") return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Success/Cancel banners */}
      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
          {isTr
            ? "Odeme basarili! Krediler hesabina eklendi."
            : "Payment successful! Credits have been added to your account."}
        </div>
      )}
      {canceled && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          {isTr ? "Odeme iptal edildi." : "Payment was canceled."}
        </div>
      )}

      {/* Current Balance */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isTr ? "Kredi Bakiyen" : "Credit Balance"}
            </p>
            <p className="mt-1 text-3xl font-bold text-teal-600">{credits}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isTr ? "Gunluk Ucretsiz Tahmin" : "Daily Free Predictions"}
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">
              {dailyRemaining}/{DAILY_FREE_PREDICTIONS}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Credit Packages */}
      <h2 className="mb-4 text-lg font-bold">
        {isTr ? "Kredi Satin Al" : "Buy Credits"}
      </h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {CREDIT_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-center transition hover:border-teal-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-teal-700"
          >
            {pkg.id === "credits_150" && (
              <span className="absolute right-2 top-2 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {isTr ? "Populer" : "Popular"}
              </span>
            )}
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {pkg.credits}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isTr ? "Kredi" : "Credits"}
            </p>
            <p className="mt-3 text-2xl font-bold text-teal-600">
              ${pkg.priceUsd}
            </p>
            <p className="text-xs text-gray-400">
              ${(pkg.priceUsd / pkg.credits).toFixed(2)}/{isTr ? "kredi" : "credit"}
            </p>
            <button
              onClick={() => buyPackage(pkg.id)}
              disabled={loading !== null}
              className="mt-4 w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {loading === pkg.id
                ? "..."
                : isTr
                  ? "Satin Al"
                  : "Buy Now"}
            </button>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-800">
        <h3 className="mb-3 text-sm font-bold">
          {isTr ? "Kredi Nasil Calisir?" : "How Credits Work?"}
        </h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>
            {isTr
              ? `• Her gun ${DAILY_FREE_PREDICTIONS} ucretsiz tahmin hakkin var (1x agirlik).`
              : `• You get ${DAILY_FREE_PREDICTIONS} free predictions every day (1x weight).`}
          </li>
          <li>
            {isTr
              ? "• Ucretsiz hakkin bitince, her ek tahmin 1 Kredi."
              : "• After free predictions, each extra prediction costs 1 Credit."}
          </li>
          <li>
            {isTr
              ? "• Agirlik artir: 2x = 2 Kredi, 5x = 5 Kredi, 10x = 10 Kredi."
              : "• Increase weight: 2x = 2 Credits, 5x = 5 Credits, 10x = 10 Credits."}
          </li>
          <li>
            {isTr
              ? "• Yuksek agirlik = dogru tahminlerde daha fazla Kurus ve itibar kazanci."
              : "• Higher weight = more Kurus and reputation earned on correct predictions."}
          </li>
        </ul>
      </div>

      {/* Purchase History */}
      {purchases.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold">
            {isTr ? "Satin Alma Gecmisi" : "Purchase History"}
          </h3>
          <div className="space-y-2">
            {purchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div>
                  <p className="text-sm font-medium dark:text-gray-100">
                    {p.amount} {isTr ? "Kredi" : "Credits"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString(
                      isTr ? "tr-TR" : "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">${p.priceUsd}</p>
                  <span
                    className={`text-xs font-medium ${
                      p.status === "COMPLETED"
                        ? "text-emerald-600"
                        : p.status === "PENDING"
                          ? "text-amber-500"
                          : "text-rose-500"
                    }`}
                  >
                    {p.status === "COMPLETED"
                      ? isTr ? "Tamamlandi" : "Completed"
                      : p.status === "PENDING"
                        ? isTr ? "Bekliyor" : "Pending"
                        : isTr ? "Basarisiz" : "Failed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

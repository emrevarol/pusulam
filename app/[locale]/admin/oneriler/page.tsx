"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/helpers";

interface Suggestion {
  id: string;
  source: string;
  titleTr: string;
  titleEn: string | null;
  descriptionTr: string;
  descriptionEn: string | null;
  category: string;
  suggestedDate: string;
  probability: number | null;
  status: string;
  createdAt: string;
}

export default function AdminSuggestionsPage() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "tr";

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && !isAdmin)) {
      router.push(`/${locale}`);
      return;
    }
    if (status === "authenticated" && isAdmin) {
      loadSuggestions();
    }
  }, [status, isAdmin, locale, router]);

  async function loadSuggestions() {
    const res = await fetch("/api/admin/market-suggestions");
    if (res.ok) {
      const data = await res.json();
      setSuggestions(data);
    }
    setLoading(false);
  }

  async function fetchNew() {
    setFetching(true);
    await fetch("/api/cron/fetch-suggestions", {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}` },
    });
    await loadSuggestions();
    setFetching(false);
  }

  async function handleAction(id: string, action: "APPROVE" | "REJECT") {
    setActionLoading(id);
    const res = await fetch("/api/admin/market-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId: id, action }),
    });
    if (res.ok) {
      await loadSuggestions();
    }
    setActionLoading(null);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">Yukleniyor...</p>
      </div>
    );
  }

  const pending = suggestions.filter((s) => s.status === "PENDING");
  const reviewed = suggestions.filter((s) => s.status !== "PENDING");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Piyasa Onerileri</h1>
        <button
          onClick={fetchNew}
          disabled={fetching}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {fetching ? "Aliniyor..." : "Yeni Onerileri Getir"}
        </button>
      </div>

      {/* Pending */}
      <h2 className="mb-3 text-lg font-bold">
        Bekleyen ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <div className="mb-8 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-800">
          <p className="text-gray-400">Bekleyen oneri yok. &quot;Yeni Onerileri Getir&quot; ile AI&apos;dan oneri isteyin.</p>
        </div>
      ) : (
        <div className="mb-8 space-y-3">
          {pending.map((s) => {
            const cat = CATEGORIES[s.category];
            return (
              <div
                key={s.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.source === "POLYMARKET"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30"
                        }`}
                      >
                        {s.source === "POLYMARKET" ? "Polymarket" : "AI Haber"}
                      </span>
                      {cat && (
                        <span className="text-xs text-gray-500">
                          {cat.emoji} {cat.label}
                        </span>
                      )}
                      {s.probability !== null && (
                        <span className="text-xs text-teal-600 font-medium">
                          %{(s.probability * 100).toFixed(0)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold">{s.titleTr}</h3>
                    {s.titleEn && (
                      <p className="text-xs text-gray-400">{s.titleEn}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">{s.descriptionTr}</p>
                    <p className="mt-1 text-[10px] text-gray-400">
                      Kapanis: {new Date(s.suggestedDate).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(s.id, "APPROVE")}
                    disabled={actionLoading !== null}
                    className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading === s.id ? "..." : "Onayla"}
                  </button>
                  <button
                    onClick={() => handleAction(s.id, "REJECT")}
                    disabled={actionLoading !== null}
                    className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-bold">
            Islenen ({reviewed.length})
          </h2>
          <div className="space-y-2">
            {reviewed.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div>
                  <p className="text-sm font-medium">{s.titleTr}</p>
                  <p className="text-xs text-gray-400">{s.source}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    s.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {s.status === "APPROVED" ? "Onaylandi" : "Reddedildi"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

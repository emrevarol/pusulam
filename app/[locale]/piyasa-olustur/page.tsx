"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/helpers";

export default function CreateMarketPage() {
  const t = useTranslations("common");
  const tcm = useTranslations("createMarket");
  const tCat = useTranslations("categories");
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "tr";

  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  // Default: tomorrow at current time
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const defaultDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T${String(tomorrow.getHours()).padStart(2, "0")}:${String(tomorrow.getMinutes()).padStart(2, "0")}:${String(tomorrow.getSeconds()).padStart(2, "0")}`;

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "GUNDEM",
    resolutionDate: defaultDate,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "unauthenticated") {
    router.push(`/${locale}/giris`);
    return null;
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isAdmin) {
        // Admin: create market directly
        const res = await fetch("/api/markets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error || t("error"));
          setLoading(false);
          return;
        }
        router.push(`/${locale}/piyasalar/${data.slug}`);
      } else {
        // Regular user: suggest market
        const res = await fetch("/api/market-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error || t("error"));
          setLoading(false);
          return;
        }
        setSuccess(tcm("suggestionSent"));
        setForm({ title: "", description: "", category: "GUNDEM", resolutionDate: defaultDate });
        setLoading(false);
      }
    } catch {
      setError(t("error"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">
        {isAdmin ? tcm("title") : tcm("suggestTitle")}
      </h1>
      {!isAdmin && (
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          {tcm("suggestDescription")}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {tcm("fieldTitle")}
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            required
            placeholder={tcm("titlePlaceholder")}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {tcm("fieldDescription")}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            required
            rows={3}
            placeholder={tcm("descriptionPlaceholder")}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {tcm("fieldCategory")}
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => updateField("category", key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  form.category === key
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {cat.emoji} {tCat(key)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {tcm("fieldEndDate")}
          </label>
          <input
            type="datetime-local"
            step="1"
            value={form.resolutionDate}
            onChange={(e) => updateField("resolutionDate", e.target.value)}
            required
            min={new Date().toISOString().slice(0, 19)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}
        {success && (
          <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "..." : isAdmin ? tcm("submitButton") : tcm("suggestButton")}
        </button>
      </form>
    </div>
  );
}

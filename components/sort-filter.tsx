"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = ["closing", "newest", "popular", "forecasters"] as const;

export function SortFilter() {
  const t = useTranslations("market");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active = searchParams.get("sirala") || "newest";

  function setSort(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "newest") {
      params.delete("sirala");
    } else {
      params.set("sirala", key);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const labels: Record<string, string> = {
    closing: t("sortClosing"),
    newest: t("sortNewest"),
    popular: t("sortPopular"),
    forecasters: t("sortForecasters"),
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={active}
        onChange={(e) => setSort(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        {SORT_OPTIONS.map((key) => (
          <option key={key} value={key}>
            {labels[key]}
          </option>
        ))}
      </select>
    </div>
  );
}

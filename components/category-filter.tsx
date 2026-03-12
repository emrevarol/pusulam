"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/helpers";

export function CategoryFilter({
  activeCategory,
}: {
  activeCategory?: string;
}) {
  const t = useTranslations("categories");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setCategory(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("kategori");
    } else {
      params.set("kategori", key);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const active = activeCategory || "all";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setCategory("all")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
          active === "all"
            ? "bg-teal-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
        }`}
      >
        {t("all")}
      </button>
      {Object.entries(CATEGORIES).map(([key, cat]) => (
        <button
          key={key}
          onClick={() => setCategory(key)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            active === key
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {cat.emoji} {t(key)}
        </button>
      ))}
    </div>
  );
}

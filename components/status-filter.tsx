"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const STATUS_OPTIONS = ["open", "resolved", "all"] as const;

export function StatusFilter({ activeStatus }: { activeStatus?: string }) {
  const t = useTranslations("market");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active = activeStatus || "open";

  function setStatus(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "open") {
      params.delete("durum");
    } else {
      params.set("durum", key);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const labels: Record<string, string> = {
    open: t("statusOpen"),
    resolved: t("statusResolved"),
    all: t("statusAll"),
  };

  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {STATUS_OPTIONS.map((key) => (
        <button
          key={key}
          onClick={() => setStatus(key)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            active === key
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          {labels[key]}
        </button>
      ))}
    </div>
  );
}

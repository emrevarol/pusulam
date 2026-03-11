"use client";

import { usePathname, useRouter } from "next/navigation";

export function LocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const currentLocale = pathname.split("/")[1] || "tr";
  const otherLocale = currentLocale === "tr" ? "en" : "tr";

  function switchLocale() {
    const segments = pathname.split("/");
    segments[1] = otherLocale;
    router.push(segments.join("/"));
  }

  return (
    <button
      onClick={switchLocale}
      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold uppercase text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      {otherLocale === "tr" ? "TR" : "EN"}
    </button>
  );
}

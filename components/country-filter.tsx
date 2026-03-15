"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { COUNTRY_LIST } from "@/lib/countries";

export function CountryFilter({ activeCountry }: { activeCountry?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setCountry(code: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (code === "all") {
      params.delete("ulke");
    } else {
      params.set("ulke", code);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => setCountry("all")}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
          !activeCountry || activeCountry === "all"
            ? "bg-teal-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
        }`}
      >
        🌍 Tümü
      </button>
      {COUNTRY_LIST.map((c) => (
        <button
          key={c.code}
          onClick={() => setCountry(c.code)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            activeCountry === c.code
              ? "bg-teal-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {c.flag} {c.code}
        </button>
      ))}
    </div>
  );
}

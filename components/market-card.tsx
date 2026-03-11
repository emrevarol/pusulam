"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/helpers";
import { Countdown } from "./countdown";

interface MarketCardProps {
  market: {
    id: string;
    title: string;
    slug: string;
    category: string;
    status: string;
    yesPool: number;
    noPool: number;
    volume: number;
    resolutionDate: string;
    traderCount?: number;
  };
}

export function MarketCard({ market }: MarketCardProps) {
  const t = useTranslations("market");
  const tCat = useTranslations("categories");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "tr";

  const yesPrice = market.noPool / (market.yesPool + market.noPool);
  const yesPct = (yesPrice * 100).toFixed(0);

  const cat = CATEGORIES[market.category];

  return (
    <Link
      href={`/${locale}/piyasalar/${market.slug}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <div className="mb-3 flex items-center gap-2">
        {cat && (
          <span className="text-xs font-medium text-gray-500">
            {cat.emoji} {tCat(market.category)}
          </span>
        )}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
            market.status === "OPEN"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {market.status === "OPEN" ? t("open") : t("closed")}
        </span>
      </div>

      <h3 className="mb-4 text-sm font-semibold leading-snug text-gray-900 group-hover:text-teal-600 dark:text-gray-100 dark:group-hover:text-teal-400">
        {market.title}
      </h3>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{t("probability")}</span>
          <span className="font-semibold text-emerald-600">%{yesPct} {t("yesShort")}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${yesPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {t("volume")}: {market.volume.toLocaleString("tr-TR")} K
          {market.traderCount ? ` · ${market.traderCount} ${locale === "tr" ? "kisi" : "traders"}` : ""}
        </span>
        <Countdown targetDate={market.resolutionDate} locale={locale} compact />
      </div>
    </Link>
  );
}

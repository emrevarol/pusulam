"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function AskAiButton({
  marketId,
  marketTitle,
  locale,
}: {
  marketId: string;
  marketTitle: string;
  locale: string;
}) {
  const t = useTranslations("common");

  return (
    <Link
      href={`/${locale}/asistan?market=${marketId}&title=${encodeURIComponent(marketTitle)}`}
      className="flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/40"
    >
      <span className="text-lg">🧭</span>
      {t("askAi")}
    </Link>
  );
}

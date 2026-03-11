"use client";

import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-gray-500">{t("disclaimer")}</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <span>{t("about")}</span>
            <span>{t("terms")}</span>
            <span>{t("privacy")}</span>
            <span>{t("contact")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

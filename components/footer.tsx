"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "tr";

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-gray-500">{t("disclaimer")}</p>
          <div className="flex gap-6 text-xs text-gray-500">
            <Link href={`/${locale}/sss`} className="hover:text-gray-700 dark:hover:text-gray-300">
              SSS
            </Link>
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

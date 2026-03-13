"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  const t = useTranslations("common");
  const { data: session } = useSession();
  const pathname = usePathname();
  const [oyHakki, setOyHakki] = useState<number | null>(null);
  const [dailyFree, setDailyFree] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const locale = pathname.split("/")[1] || "tr";

  function fetchBalance() {
    fetch("/api/user/balance")
      .then((r) => r.json())
      .then((d) => {
        setOyHakki(d.oyHakki ?? 0);
        setDailyFree(d.dailyFreeRemaining ?? 0);
      });
  }

  useEffect(() => {
    if (session?.user) fetchBalance();
  }, [session, pathname]);

  useEffect(() => {
    function onTradeComplete() {
      if (session?.user) fetchBalance();
    }
    window.addEventListener("trade-complete", onTradeComplete);
    return () => window.removeEventListener("trade-complete", onTradeComplete);
  }, [session]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href={`/${locale}`}
            className="text-xl font-bold tracking-tight text-teal-600"
          >
            🧭 {t("appName")}
          </Link>
          <div className="hidden items-center gap-4 sm:flex">
            <Link
              href={`/${locale}/piyasalar`}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {t("markets")}
            </Link>
            <Link
              href={`/${locale}/skor`}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {t("leaderboard")}
            </Link>
            <Link
              href={`/${locale}/asistan`}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {t("aiAssistant")}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LocaleSwitcher />

          {session?.user ? (
            <div className="flex items-center gap-3">
              <Link
                href={`/${locale}/piyasa-olustur`}
                className="hidden rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/20 sm:block"
              >
                {(session.user as { role?: string }).role === "ADMIN" ? t("createMarket") : t("suggestMarket")}
              </Link>
              <Link
                href={`/${locale}/kredi`}
                className="flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/40"
              >
                <span>{oyHakki !== null ? oyHakki : "..."}</span>
                <span className="text-xs opacity-70">{t("oyHakki")}</span>
                {dailyFree > 0 && (
                  <span className="rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    +{dailyFree}
                  </span>
                )}
              </Link>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600 dark:bg-teal-900/30"
                >
                  {session.user.name?.charAt(0).toUpperCase()}
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                      <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                        <p className="text-sm font-semibold">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          @{session.user.username}
                        </p>
                      </div>
                      <Link
                        href={`/${locale}/profil`}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {t("profile")}
                      </Link>
                      <Link
                        href={`/${locale}/kredi`}
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {t("buyOyHakki")}
                      </Link>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          signOut();
                        }}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {t("logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/giris`}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t("login")}
              </Link>
              <Link
                href={`/${locale}/kayit`}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
              >
                {t("register")}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

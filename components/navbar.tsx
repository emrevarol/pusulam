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
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const locale = pathname.split("/")[1] || "tr";
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  function fetchBalance() {
    fetch("/api/user/balance")
      .then((r) => r.json())
      .then((d) => {
        setOyHakki(d.oyHakki ?? 0);
      });
  }

  useEffect(() => {
    if (session?.user) {
      fetchBalance();
      fetch("/api/friends/requests")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setFriendRequestCount(data.length);
        })
        .catch(() => {});
      fetch("/api/notifications?unread=true&limit=1")
        .then((r) => r.json())
        .then((data) => {
          if (data.unreadCount !== undefined) setUnreadNotifications(data.unreadCount);
        })
        .catch(() => {});
    }
    if (isAdmin) {
      fetch("/api/admin/market-suggestions")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setPendingCount(data.filter((s: { status: string }) => s.status === "PENDING").length);
          }
        })
        .catch(() => {});
    }
  }, [session, pathname, isAdmin]);

  useEffect(() => {
    function onTradeComplete() {
      if (session?.user) fetchBalance();
    }
    window.addEventListener("trade-complete", onTradeComplete);
    return () => window.removeEventListener("trade-complete", onTradeComplete);
  }, [session]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: `/${locale}/piyasalar`, label: t("markets") },
    { href: `/${locale}/skor`, label: t("leaderboard") },
    { href: `/${locale}/kullanicilar`, label: t("users") },
    { href: `/${locale}/akis`, label: "Akis" },
    { href: `/${locale}/asistan`, label: t("aiAssistant") },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:h-16 sm:px-4">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 sm:hidden"
              aria-label="Menu"
            >
              {mobileNavOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <Link
              href={`/${locale}`}
              className="text-lg font-bold tracking-tight text-teal-600 sm:text-xl"
            >
              🧭 {t("appName")}
            </Link>

            {/* Desktop nav links */}
            <div className="hidden items-center gap-4 sm:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && pendingCount > 0 && (
                <Link
                  href={`/${locale}/admin/oneriler`}
                  className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  {t("adminSuggestions")}
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <span className="hidden sm:block"><LocaleSwitcher /></span>

            {session?.user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href={`/${locale}/piyasa-olustur`}
                  className="hidden rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/20 sm:block"
                >
                  {(session.user as { role?: string }).role === "ADMIN" ? t("createMarket") : t("suggestMarket")}
                </Link>
                {/* Notification bell */}
                <Link
                  href={`/${locale}/bildirimler`}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
                <Link
                  href={`/${locale}/kredi`}
                  className="flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/40 sm:gap-1.5 sm:px-3"
                >
                  <span>{oyHakki !== null ? oyHakki : "..."}</span>
                  <span className="hidden text-xs opacity-70 sm:inline">{t("oyHakki")}</span>
                </Link>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600 dark:bg-teal-900/30"
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
                          href={`/${locale}/bildirimler`}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Bildirimler
                          {unreadNotifications > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                              {unreadNotifications}
                            </span>
                          )}
                        </Link>
                        <Link
                          href={`/${locale}/arkadaslar`}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {t("friends")}
                          {friendRequestCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                              {friendRequestCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          href={`/${locale}/kredi`}
                          onClick={() => setMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {t("buyOyHakki")}
                        </Link>
                        {(session.user as { role?: string }).role === "ADMIN" && (
                          <Link
                            href={`/${locale}/admin/oneriler`}
                            onClick={() => setMenuOpen(false)}
                            className="block px-4 py-2 text-sm text-amber-600 hover:bg-gray-50 dark:text-amber-400 dark:hover:bg-gray-800"
                          >
                            {t("adminSuggestions")}
                          </Link>
                        )}
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

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="border-t border-gray-200 bg-white px-4 pb-4 pt-2 dark:border-gray-800 dark:bg-gray-950 sm:hidden">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {link.label}
                </Link>
              ))}
              {session?.user && (
                <>
                  <Link
                    href={`/${locale}/arkadaslar`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {t("friends")}
                    {friendRequestCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                        {friendRequestCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href={`/${locale}/piyasa-olustur`}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20"
                  >
                    {(session.user as { role?: string }).role === "ADMIN" ? t("createMarket") : t("suggestMarket")}
                  </Link>
                </>
              )}
              {isAdmin && pendingCount > 0 && (
                <Link
                  href={`/${locale}/admin/oneriler`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-600 hover:bg-gray-100 dark:text-amber-400"
                >
                  {t("adminSuggestions")}
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                </Link>
              )}
              <div className="flex items-center gap-2 px-3 pt-2">
                <LocaleSwitcher />
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

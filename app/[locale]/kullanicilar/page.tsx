"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface UserEntry {
  id: string;
  displayName: string;
  username: string;
  oyHakki: number;
  reputation: number;
  _count: { trades: number };
  friendshipStatus: string;
}

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const tf = useTranslations("friends");
  const { data: session } = useSession();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "tr";

  const [users, setUsers] = useState<UserEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  function fetchUsers(q: string, p: number) {
    setLoading(true);
    fetch(`/api/users?q=${encodeURIComponent(q)}&page=${p}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchUsers(search, page);
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function sendFriendRequest(userId: string) {
    const res = await fetch("/api/friends/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId: userId }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, friendshipStatus: "PENDING_SENT" } : u
        )
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {session?.user && (
          <Link
            href={`/${locale}/arkadaslar`}
            className="rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400"
          >
            {tf("myFriends")}
          </Link>
        )}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="mb-6 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800"
      />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-gray-400">{tc("loading")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600 dark:bg-teal-900/30">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{user.displayName}</p>
                  <p className="text-xs text-gray-500">
                    @{user.username} · {user._count.trades} oy
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600 font-medium">
                    {user.oyHakki} OH
                  </span>
                  {session?.user && user.friendshipStatus === "NONE" && (
                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                    >
                      {tf("addFriend")}
                    </button>
                  )}
                  {user.friendshipStatus === "PENDING_SENT" && (
                    <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 dark:bg-gray-800">
                      {tf("pending")}
                    </span>
                  )}
                  {user.friendshipStatus === "PENDING_RECEIVED" && (
                    <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-600 dark:bg-amber-900/20">
                      {tf("accept")}
                    </span>
                  )}
                  {user.friendshipStatus === "FRIENDS" && (
                    <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:bg-emerald-900/20">
                      {tf("alreadyFriends")}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
                <p className="text-gray-400">{t("noResults")}</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    p === page
                      ? "bg-teal-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

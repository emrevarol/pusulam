"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";

interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  bio: string | null;
  reputation: number;
  oyHakki: number;
  streak: number;
  createdAt: string;
  _count: { trades: number; comments: number };
  badges: Array<{
    earnedAt: string;
    badge: { name: string; icon: string; tier: string; description: string };
  }>;
  positions: Array<{
    side: string;
    shares: number;
    market: { title: string; slug: string; category: string; status: string };
  }>;
  friendshipStatus: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "FRIENDS" | "SELF";
}

const TIER_COLORS: Record<string, string> = {
  BRONZE: "border-amber-600 bg-amber-50 dark:bg-amber-900/20",
  SILVER: "border-gray-400 bg-gray-50 dark:bg-gray-800",
  GOLD: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
  PLATINUM: "border-purple-500 bg-purple-50 dark:bg-purple-900/20",
};

export default function PublicProfilePage() {
  const t = useTranslations("publicProfile");
  const bt = useTranslations("badges");
  const { data: session } = useSession();
  const pathname = usePathname();
  const params = useParams();
  const locale = pathname.split("/")[1] || "tr";
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendAction, setFriendAction] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${username}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setProfile(data))
      .catch(() => setError("Kullanici bulunamadi."))
      .finally(() => setLoading(false));
  }, [username]);

  async function sendFriendRequest() {
    if (!profile) return;
    setFriendAction(true);
    await fetch("/api/friends/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId: profile.id }),
    });
    setProfile((prev) =>
      prev ? { ...prev, friendshipStatus: "PENDING_SENT" } : null
    );
    setFriendAction(false);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-500">
        Yukleniyor...
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-500">
        {error || "Kullanici bulunamadi."}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Profile header */}
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-2xl font-bold text-teal-600 dark:bg-teal-900/30">
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {profile.displayName}
          </h1>
          <p className="text-sm text-gray-500">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {profile.bio}
            </p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span>{profile._count.trades} {t("trades")}</span>
            <span>Rep: {profile.reputation.toFixed(1)}</span>
            {profile.streak > 0 && <span>🔥 {profile.streak} gun</span>}
            <span>
              {t("joined")}: {new Date(profile.createdAt).toLocaleDateString("tr-TR")}
            </span>
          </div>
        </div>

        {/* Friend action */}
        {profile.friendshipStatus !== "SELF" && session?.user && (
          <div>
            {profile.friendshipStatus === "NONE" && (
              <button
                onClick={sendFriendRequest}
                disabled={friendAction}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {t("addFriend")}
              </button>
            )}
            {profile.friendshipStatus === "PENDING_SENT" && (
              <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-500 dark:bg-gray-800">
                Bekliyor
              </span>
            )}
            {profile.friendshipStatus === "FRIENDS" && (
              <span className="rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Arkadas
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-teal-600">{profile.oyHakki}</p>
          <p className="text-xs text-gray-500">Oy Hakki</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-teal-600">{profile._count.trades}</p>
          <p className="text-xs text-gray-500">{t("trades")}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-teal-600">{profile._count.comments}</p>
          <p className="text-xs text-gray-500">Yorum</p>
        </div>
      </div>

      {/* Badges */}
      {profile.badges.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{bt("title")}</h2>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((ub, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${TIER_COLORS[ub.badge.tier] || ""}`}
                title={ub.badge.description}
              >
                <span className="text-lg">{ub.badge.icon}</span>
                <span className="text-sm font-medium">{ub.badge.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active positions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("positions")}</h2>
        {profile.positions.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noPredictions")}</p>
        ) : (
          <div className="space-y-2">
            {profile.positions
              .filter((p) => p.shares > 0)
              .map((pos, i) => (
                <Link
                  key={i}
                  href={`/${locale}/piyasalar/${pos.market.slug}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        pos.side === "YES"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                      }`}
                    >
                      {pos.side}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {pos.market.title}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">
                    {pos.shares.toFixed(1)} oy
                  </span>
                </Link>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}

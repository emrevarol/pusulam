"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface Friend {
  id: string;
  displayName: string;
  username: string;
  oyHakki: number;
  reputation: number;
  _count: { trades: number };
  friendshipId: string;
}

interface FriendRequest {
  id: string;
  requester: { id: string; displayName: string; username: string };
}

interface ReferralStats {
  referralCode: string;
  referralCount: number;
  qualifiedCount: number;
  totalBonus: number;
}

export default function FriendsPage() {
  const t = useTranslations("friends");
  const tr = useTranslations("referral");
  const tc = useTranslations("common");
  const { data: session } = useSession();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "tr";

  const [tab, setTab] = useState<"friends" | "requests" | "invite">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    Promise.all([
      fetch("/api/friends").then((r) => r.json()),
      fetch("/api/friends/requests").then((r) => r.json()),
      fetch("/api/referral").then((r) => r.json()),
    ]).then(([f, r, ref]) => {
      setFriends(f);
      setRequests(r);
      setReferral(ref);
      setLoading(false);
    });
  }, [session]);

  async function acceptRequest(id: string) {
    const res = await fetch(`/api/friends/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ACCEPT" }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      // Refresh friends list
      fetch("/api/friends")
        .then((r) => r.json())
        .then(setFriends);
    }
  }

  async function rejectRequest(id: string) {
    const res = await fetch(`/api/friends/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REJECT" }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  }

  async function removeFriend(friendId: string) {
    const res = await fetch("/api/friends/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    if (res.ok) {
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    }
  }

  function copyReferralLink() {
    if (!referral) return;
    const link = `${window.location.origin}/${locale}/kayit?ref=${referral.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Link
          href={`/${locale}/giris`}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          {tc("loginRequired")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">{tc("loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href={`/${locale}/kullanicilar`}
          className="rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400"
        >
          {t("findFriends")}
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {(["friends", "requests", "invite"] as const).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              tab === t2
                ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {t2 === "friends" && t("myFriends")}
            {t2 === "requests" && (
              <>
                {t("requests")}
                {requests.length > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {requests.length}
                  </span>
                )}
              </>
            )}
            {t2 === "invite" && tr("title")}
          </button>
        ))}
      </div>

      {/* Friends Tab */}
      {tab === "friends" && (
        <div className="space-y-2">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-600 dark:bg-teal-900/30">
                {friend.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{friend.displayName}</p>
                <p className="text-xs text-gray-500">
                  @{friend.username} · {friend._count.trades} oy
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-emerald-600">
                  {friend.oyHakki} OH
                </span>
                <button
                  onClick={() => removeFriend(friend.id)}
                  className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                >
                  {t("removeFriend")}
                </button>
              </div>
            </div>
          ))}
          {friends.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
              <p className="mb-4 text-gray-400">{t("noFriends")}</p>
              <Link
                href={`/${locale}/kullanicilar`}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                {t("findFriends")}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {tab === "requests" && (
        <div className="space-y-2">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-600 dark:bg-amber-900/30">
                {req.requester.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {req.requester.displayName}
                </p>
                <p className="text-xs text-gray-500">
                  @{req.requester.username}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => acceptRequest(req.id)}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                >
                  {t("accept")}
                </button>
                <button
                  onClick={() => rejectRequest(req.id)}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                >
                  {t("reject")}
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-800">
              <p className="text-gray-400">{t("noRequests")}</p>
            </div>
          )}
        </div>
      )}

      {/* Invite Tab */}
      {tab === "invite" && referral && (
        <div className="space-y-6">
          {/* Referral Code */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-2 text-sm font-medium text-gray-500">
              {tr("yourCode")}
            </p>
            <div className="flex items-center gap-3">
              <code className="rounded-lg bg-gray-100 px-4 py-2 text-lg font-bold tracking-wider dark:bg-gray-800">
                {referral.referralCode}
              </code>
              <button
                onClick={copyReferralLink}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                {copied ? tr("linkCopied") : tr("copyLink")}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-2xl font-bold text-teal-600">
                {referral.referralCount}
              </p>
              <p className="text-xs text-gray-500">{tr("invited")}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-2xl font-bold text-emerald-600">
                {referral.qualifiedCount}
              </p>
              <p className="text-xs text-gray-500">{tr("qualified")}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-2xl font-bold text-amber-600">
                {referral.totalBonus}
              </p>
              <p className="text-xs text-gray-500">{tr("earned")}</p>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="mb-3 text-sm font-semibold">{tr("howItWorks")}</h3>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>1. {tr("rule1")}</li>
              <li>2. {tr("rule2")}</li>
              <li>3. {tr("rule3")}</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import type { Metadata } from "next";

const FEATURES = [
  {
    name: "AI Asistan Modeli",
    free: "Haiku (hızlı)",
    premium: "Sonnet (gelişmiş analiz)",
    icon: "🤖",
  },
  {
    name: "AI Sohbet / Saat",
    free: "20",
    premium: "400",
    icon: "💬",
  },
  {
    name: "Web Araması / Sohbet",
    free: "2 kaynak",
    premium: "6 kaynak",
    icon: "🔍",
  },
  {
    name: "Günlük Oy Hakkı",
    free: "+3",
    premium: "+60",
    icon: "🎯",
  },
  {
    name: "Konuşma Geçmişi",
    free: "20 konuşma",
    premium: "400 konuşma",
    icon: "📝",
  },
  {
    name: "Streak Freeze",
    free: "—",
    premium: "Ayda 3 hak",
    icon: "🔥",
  },
  {
    name: "Gelişmiş İstatistikler",
    free: "—",
    premium: "Kalibrasyon grafiği, detaylı analiz",
    icon: "📊",
  },
  {
    name: "Premium Rozetler",
    free: "—",
    premium: "Altın Premium rozet",
    icon: "👑",
  },
  {
    name: "Premium Piyasalar",
    free: "—",
    premium: "Özel tahmin piyasalarına erişim",
    icon: "🔒",
  },
];

export default function PremiumPage() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "tr";
  const [loading, setLoading] = useState(false);
  const [trialAvailable, setTrialAvailable] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("FREE");

  useEffect(() => {
    if (session?.user) {
      fetch("/api/subscription")
        .then((r) => r.json())
        .then((data) => {
          setCurrentPlan(data.plan || "FREE");
          setTrialAvailable(data.trialAvailable ?? false);
        })
        .catch(() => {});
    }
  }, [session]);

  async function startTrial() {
    setLoading(true);
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trial" }),
    });
    const data = await res.json();
    if (data.success) {
      router.push(`/${locale}/profil?premium=trial`);
    }
    setLoading(false);
  }

  async function subscribe() {
    setLoading(true);
    const res = await fetch("/api/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "subscribe" }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <span className="mb-4 inline-block text-5xl">👑</span>
        <h1 className="mb-3 text-3xl font-bold">Pusulam Premium</h1>
        <p className="mx-auto max-w-lg text-gray-600 dark:text-gray-400">
          Daha güçlü AI analizi, günlük 20 kat oy hakkı, gelişmiş istatistikler ve özel piyasalarla tahmin gücünü artır.
        </p>
      </div>

      {/* Pricing card */}
      <div className="mb-12 flex justify-center">
        <div className="w-full max-w-sm rounded-2xl border-2 border-amber-400 bg-white p-8 text-center shadow-lg dark:bg-gray-900">
          <p className="mb-1 text-sm font-medium text-amber-600">Premium</p>
          <p className="mb-1">
            <span className="text-4xl font-bold">$5</span>
            <span className="text-gray-500"> /ay</span>
          </p>
          <p className="mb-6 text-xs text-gray-400">İstediğin zaman iptal et</p>

          {currentPlan === "PREMIUM" ? (
            <div className="rounded-xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
              Aktif Premium Üye ✓
            </div>
          ) : (
            <div className="space-y-2">
              {trialAvailable && (
                <button
                  onClick={startTrial}
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 py-3 text-sm font-bold text-white hover:from-amber-500 hover:to-amber-700 disabled:opacity-50"
                >
                  {loading ? "..." : "7 Gün Ücretsiz Dene"}
                </button>
              )}
              <button
                onClick={session ? subscribe : () => router.push(`/${locale}/kayit`)}
                disabled={loading}
                className={`w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50 ${
                  trialAvailable
                    ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    : "bg-gradient-to-r from-amber-400 to-amber-600 text-white hover:from-amber-500 hover:to-amber-700"
                }`}
              >
                {loading ? "..." : session ? "Hemen Abone Ol" : "Kayıt Ol ve Başla"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feature comparison */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Özellik</p>
          <p className="text-center text-sm font-semibold text-gray-500">Ücretsiz</p>
          <p className="text-center text-sm font-semibold text-amber-600">Premium</p>
        </div>
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className={`grid grid-cols-3 items-center px-4 py-3 ${
              i < FEATURES.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{f.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.name}</span>
            </div>
            <p className="text-center text-sm text-gray-500">{f.free}</p>
            <p className="text-center text-sm font-medium text-gray-900 dark:text-gray-100">{f.premium}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="mb-6 text-center text-xl font-bold">Sıkça Sorulan Sorular</h2>
        <div className="space-y-3">
          {[
            {
              q: "Deneme süresi nasıl çalışır?",
              a: "7 gün boyunca tüm Premium özelliklerini ücretsiz kullanabilirsin. Süre sonunda otomatik olarak Free plana döner, kredi kartı gerekmez.",
            },
            {
              q: "İstediğim zaman iptal edebilir miyim?",
              a: "Evet. Aboneliğini istediğin zaman iptal edebilirsin. Mevcut dönem sonuna kadar Premium özellikleri kullanmaya devam edersin.",
            },
            {
              q: "Premium piyasalar nedir?",
              a: "Premium üyelere özel tahmin piyasalarıdır. Daha niş, daha detaylı ve genellikle daha yüksek kazanç potansiyeli olan konularda açılır.",
            },
            {
              q: "Streak freeze ne işe yarar?",
              a: "Günlük tahmin serin kırıldığında streak freeze kullanarak seriyi koruyabilirsin. Ayda 3 hakkın var.",
            },
          ].map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.q}
                <svg className="h-4 w-4 shrink-0 text-gray-400 transition group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t border-gray-100 px-5 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

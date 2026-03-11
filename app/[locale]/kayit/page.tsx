"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "tr";

  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("passwordMismatch"));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          displayName: form.displayName,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("registerError"));
        setLoading(false);
        return;
      }

      // Auto-login after registration
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      router.push(`/${locale}`);
      router.refresh();
    } catch {
      setError(t("registerError"));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-bold">
          {t("registerTitle")}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("displayName")}
            </label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => updateField("displayName", e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("username")}
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => updateField("username", e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("email")}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("password")}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("confirmPassword")}
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "..." : t("registerButton")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t("hasAccount")}{" "}
          <Link
            href={`/${locale}/giris`}
            className="font-medium text-teal-600 hover:text-teal-700"
          >
            {t("loginButton")}
          </Link>
        </p>
      </div>
    </div>
  );
}

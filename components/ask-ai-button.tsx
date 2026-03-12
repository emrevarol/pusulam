"use client";

import { useState, useRef, useEffect } from "react";
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
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isTr = locale === "tr";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          locale,
          conversationId,
          marketId: !conversationId ? marketId : undefined,
        }),
      });

      const data = await res.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || (isTr ? "Bir hata olustu." : "An error occurred.") },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: isTr ? "Baglanti hatasi." : "Connection error." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = isTr
    ? [
        "Bu piyasayi analiz et",
        "Olasiligin artma ihtimali nedir?",
        "Farkli bakis acilari neler?",
      ]
    : [
        "Analyze this market",
        "What could increase the probability?",
        "What are different perspectives?",
      ];

  return (
    <>
      {/* Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/40"
      >
        <span className="text-lg">🧭</span>
        {t("askAi")}
      </button>

      {/* Backdrop + Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-gray-950">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧭</span>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {isTr ? "AI Asistan" : "AI Assistant"}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Market context badge */}
            <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-800">
              <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-1.5 text-xs text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
                <span>📊</span>
                <span className="truncate">{marketTitle}</span>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center">
                  <p className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {isTr
                      ? `"${marketTitle}" hakkinda soru sor.`
                      : `Ask about "${marketTitle}".`}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:border-teal-300 hover:text-teal-600 dark:border-gray-700 dark:text-gray-400"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-teal-600 text-white"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isTr ? "Soru sor..." : "Ask a question..."}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {loading ? "..." : "→"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

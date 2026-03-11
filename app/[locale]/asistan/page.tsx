"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "tr";
  const isTr = locale === "tr";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/giris`);
    }
  }, [status, locale, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        body: JSON.stringify({ message: userMessage, history: messages }),
      });

      const data = await res.json();
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
        "Dolar Haziran'da 46'yi gecer mi?",
        "TCMB faiz indirimine ara verir mi?",
        "Iran savasi piyasalari nasil etkiler?",
        "Hangi piyasalarda firsat var?",
      ]
    : [
        "Will USD/TRY exceed 46 by June?",
        "Will TCMB pause rate cuts?",
        "How does the Iran war affect markets?",
        "Which markets have opportunities?",
      ];

  if (status === "loading") return null;

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-3xl dark:bg-teal-900/20">
              🧭
            </div>
            <h1 className="mb-2 text-xl font-bold">
              {isTr ? "Pusulam AI Asistan" : "Pusulam AI Assistant"}
            </h1>
            <p className="mb-8 max-w-md text-center text-sm text-gray-500">
              {isTr
                ? "Piyasalar hakkinda sorular sor, analiz iste, farkli bakis acilarini ogren."
                : "Ask about markets, request analysis, learn different perspectives."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-600 transition hover:border-teal-300 hover:text-teal-600 dark:border-gray-700 dark:text-gray-400"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
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
                <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
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
      <div className="border-t border-gray-200 py-4 dark:border-gray-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isTr ? "Piyasalar hakkinda bir soru sor..." : "Ask about markets..."}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "..." : "→"}
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-gray-400">
          {isTr
            ? "AI asistan tahmin danismanligi yapmaz. Sadece bilgi ve analiz sunar."
            : "AI assistant does not provide prediction advice. It only offers information and analysis."}
        </p>
      </div>
    </div>
  );
}

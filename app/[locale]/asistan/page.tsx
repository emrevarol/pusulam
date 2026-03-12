"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConversationItem {
  id: string;
  title: string | null;
  marketId: string | null;
  createdAt: string;
  market?: { title: string; slug: string } | null;
  messages?: { content: string }[];
}

export default function AssistantPage() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = pathname.split("/")[1] || "tr";
  const isTr = locale === "tr";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get marketId from URL params (when coming from market page)
  const marketId = searchParams.get("market");
  const marketTitle = searchParams.get("title");

  // Load conversations list
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/${locale}/giris`);
    }
    if (session?.user) {
      loadConversations();
    }
  }, [status, locale, router, session, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load a specific conversation
  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConversationId(data.id);
        setMessages(data.messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })));
        setSidebarOpen(false);
      }
    } catch { /* ignore */ }
  }

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  }

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
      loadConversations();
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
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-5xl bg-white dark:bg-gray-950">
      {/* Sidebar - conversation history */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } fixed inset-y-0 left-0 z-30 w-72 border-r border-gray-200 bg-white pt-16 transition-transform lg:static lg:z-auto lg:pt-0 dark:border-gray-800 dark:bg-gray-950`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-800">
            <h2 className="text-sm font-semibold">{isTr ? "Konusmalar" : "Conversations"}</h2>
            <button
              onClick={startNewConversation}
              className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700"
            >
              + {isTr ? "Yeni" : "New"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
                {isTr ? "Henuz konusma yok" : "No conversations yet"}
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full border-b border-gray-100 px-3 py-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900 ${
                    conversationId === conv.id ? "bg-teal-50 dark:bg-teal-900/20" : ""
                  }`}
                >
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                    {conv.title || (isTr ? "Yeni konusma" : "New conversation")}
                  </p>
                  {conv.market && (
                    <p className="mt-0.5 truncate text-xs text-teal-600 dark:text-teal-400">
                      📊 {conv.market.title}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {new Date(conv.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col bg-white px-4 dark:bg-gray-950">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-gray-200 py-3 dark:border-gray-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {marketTitle && !conversationId && (
            <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-1 text-xs text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
              <span>📊</span>
              <span className="truncate max-w-[300px]">{decodeURIComponent(marketTitle)}</span>
            </div>
          )}
        </div>

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
              <p className="mb-8 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
                {marketTitle
                  ? (isTr ? `"${decodeURIComponent(marketTitle)}" hakkinda soru sor.` : `Ask about "${decodeURIComponent(marketTitle)}".`)
                  : (isTr ? "Piyasalar hakkinda sorular sor, analiz iste, farkli bakis acilarini ogren." : "Ask about markets, request analysis, learn different perspectives.")}
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
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
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
          <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">
            {isTr
              ? "AI asistan tahmin danismanligi yapmaz. Sadece bilgi ve analiz sunar."
              : "AI assistant does not provide prediction advice. It only offers information and analysis."}
          </p>
        </div>
      </div>
    </div>
  );
}

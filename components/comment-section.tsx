"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface CommentVote {
  userId: string;
  value: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { displayName: string; username: string };
  votes: CommentVote[];
  _count?: { votes: number };
}

export function CommentSection({
  marketId,
  comments,
  currentUserId,
}: {
  marketId: string;
  comments: Comment[];
  currentUserId?: string;
}) {
  const t = useTranslations("market");
  const { data: session } = useSession();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !session) return;

    setLoading(true);
    try {
      await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, content: content.trim() }),
      });
      setContent("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-4 text-lg font-bold">
        {t("comments")} ({comments.length})
      </h3>

      {session && (
        <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("addComment")}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "..." : "→"}
          </button>
        </form>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-gray-400">{t("noComments")}</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
}: {
  comment: Comment;
  currentUserId?: string;
}) {
  const likes = comment.votes?.filter((v) => v.value === 1).length || 0;
  const dislikes = comment.votes?.filter((v) => v.value === -1).length || 0;
  const myVote = comment.votes?.find((v) => v.userId === currentUserId)?.value || 0;

  const [optimisticLikes, setLikes] = useState(likes);
  const [optimisticDislikes, setDislikes] = useState(dislikes);
  const [myVoteState, setMyVote] = useState(myVote);
  const [voting, setVoting] = useState(false);

  async function vote(value: 1 | -1) {
    if (!currentUserId || voting) return;
    setVoting(true);

    // Optimistic update
    if (myVoteState === value) {
      // Toggle off
      if (value === 1) setLikes((l) => l - 1);
      else setDislikes((d) => d - 1);
      setMyVote(0);
    } else {
      // Remove old vote
      if (myVoteState === 1) setLikes((l) => l - 1);
      if (myVoteState === -1) setDislikes((d) => d - 1);
      // Add new vote
      if (value === 1) setLikes((l) => l + 1);
      else setDislikes((d) => d + 1);
      setMyVote(value);
    }

    await fetch("/api/comment/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: comment.id, value }),
    });
    setVoting(false);
  }

  return (
    <div className="border-b border-gray-100 pb-3 last:border-0 dark:border-gray-800">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-sm font-semibold">{comment.user.displayName}</span>
        <span className="text-xs text-gray-400">@{comment.user.username}</span>
        <span className="text-xs text-gray-400">
          {new Date(comment.createdAt).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => vote(1)}
          disabled={!currentUserId}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition ${
            myVoteState === 1
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
              : "text-gray-400 hover:text-emerald-600"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M12.78 7.28a.75.75 0 0 0-1.06-1.06L8.5 9.44V2.75a.75.75 0 0 0-1.5 0v6.69L3.78 6.22a.75.75 0 0 0-1.06 1.06l4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25Z" transform="rotate(180 8 8)" />
          </svg>
          {optimisticLikes > 0 && optimisticLikes}
        </button>
        <button
          onClick={() => vote(-1)}
          disabled={!currentUserId}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition ${
            myVoteState === -1
              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30"
              : "text-gray-400 hover:text-rose-600"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M12.78 7.28a.75.75 0 0 0-1.06-1.06L8.5 9.44V2.75a.75.75 0 0 0-1.5 0v6.69L3.78 6.22a.75.75 0 0 0-1.06 1.06l4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25Z" />
          </svg>
          {optimisticDislikes > 0 && optimisticDislikes}
        </button>
      </div>
    </div>
  );
}

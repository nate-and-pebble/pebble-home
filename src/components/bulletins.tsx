"use client";

import { useEffect, useState, useCallback } from "react";

interface Bulletin {
  id: string;
  title: string;
  content: string | null;
  status: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Bulletins({
  refreshKey,
  onReply,
}: {
  refreshKey?: number;
  onReply?: () => void;
}) {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySending, setReplySending] = useState(false);

  const fetchBulletins = useCallback(async () => {
    try {
      const res = await fetch("/api/bulletins?limit=10");
      if (!res.ok) return;
      const json = await res.json();
      setBulletins(json.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBulletins();
  }, [fetchBulletins, refreshKey]);

  async function markRead(id: string) {
    await fetch(`/api/bulletins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "read" }),
    });
    setBulletins((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "read" } : b))
    );
  }

  async function handleReply(bulletin: Bulletin) {
    if (!replyContent.trim()) return;
    setReplySending(true);

    try {
      const res = await fetch("/api/brain-dumps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `[Re: ${bulletin.title}] ${replyContent.trim()}`,
          metadata: {
            reply_to_bulletin: bulletin.id,
            reply_to_title: bulletin.title,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to send reply");

      setReplyContent("");
      setReplyingTo(null);
      onReply?.();
    } catch {
      // silently fail
    } finally {
      setReplySending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-zinc-800/50 bg-zinc-900/30"
          />
        ))}
      </div>
    );
  }

  if (bulletins.length === 0) {
    return (
      <p className="text-center text-xs text-zinc-700 py-6">
        No bulletins yet. Pebble will post updates here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {bulletins.map((b) => {
        const isNew = b.status === "new";
        const isExpanded = expanded === b.id;

        return (
          <div
            key={b.id}
            className={`rounded-lg border p-3 transition-colors duration-200 cursor-pointer ${
              isNew
                ? "border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-950/30"
                : "border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/50"
            }`}
            onClick={() => {
              setExpanded(isExpanded ? null : b.id);
              if (isNew) markRead(b.id);
            }}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-sm">{isNew ? "📢" : "📋"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {b.title}
                  </span>
                  {isNew && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-indigo-900/50 text-indigo-300">
                      New
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600">{timeAgo(b.created_at)}</p>
                {isExpanded && b.content && (
                  <p className="mt-2 text-sm text-zinc-400 whitespace-pre-wrap">
                    {b.content}
                  </p>
                )}
                {isExpanded && (
                  <div className="mt-2">
                    {replyingTo === b.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Reply to Pebble..."
                          rows={2}
                          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.metaKey) {
                              e.stopPropagation();
                              handleReply(b);
                            }
                          }}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyingTo(null);
                              setReplyContent("");
                            }}
                            className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReply(b);
                            }}
                            disabled={!replyContent.trim() || replySending}
                            className="rounded-lg bg-indigo-600 px-3 py-1 text-[10px] font-medium text-white transition-all duration-200 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                          >
                            {replySending ? "Sending..." : "Send Reply"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingTo(b.id);
                        }}
                        className="text-[10px] text-indigo-400/70 hover:text-indigo-300 transition-colors"
                      >
                        Reply to Pebble
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface BrainDumpItem {
  id: string;
  content: string;
  status: string;
  created_at: string;
  metadata: Record<string, unknown>;
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

function DeleteButton({
  onDelete,
  label,
}: {
  onDelete: () => void;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            setConfirming(false);
          }}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-900/50 text-red-300 hover:bg-red-900/80 transition-colors"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(false);
          }}
          className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setConfirming(true);
      }}
      className="rounded px-1.5 py-0.5 text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
      title={label || "Delete"}
    >
      {label || "Delete"}
    </button>
  );
}

function ThreadView({
  rootDump,
  onReplySent,
  onDeleted,
}: {
  rootDump: BrainDumpItem;
  onReplySent: () => void;
  onDeleted: () => void;
}) {
  const [thread, setThread] = useState<BrainDumpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    try {
      const res = await fetch(`/api/brain-dumps/${rootDump.id}/thread`);
      if (!res.ok) return;
      const json = await res.json();
      setThread(json.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [rootDump.id]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  useEffect(() => {
    if (thread.length > 1) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [thread.length]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/brain-dumps/${rootDump.id}/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim(), author: "nate" }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setReply("");
      fetchThread();
      onReplySent();
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteReply(replyId: string) {
    try {
      const res = await fetch(`/api/brain-dumps/${replyId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      fetchThread();
      onReplySent();
    } catch {
      // silently fail
    }
  }

  async function handleDeleteRoot() {
    try {
      const res = await fetch(`/api/brain-dumps/${rootDump.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      onDeleted();
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="mt-3 space-y-2">
        <div className="h-10 animate-pulse rounded-lg bg-zinc-900/50" />
      </div>
    );
  }

  const replies = thread.slice(1);

  return (
    <div className="mt-3 space-y-2">
      {/* Full root message */}
      <div className="rounded-lg bg-zinc-800/30 border border-zinc-700/30 px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-medium text-zinc-400">
            👤 You
          </span>
          <span className="text-[10px] text-zinc-600">
            {timeAgo(rootDump.created_at)}
          </span>
          <span
            className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium ${
              rootDump.status === "processed"
                ? "bg-emerald-900/50 text-emerald-300"
                : "bg-amber-900/50 text-amber-300"
            }`}
          >
            {rootDump.status}
          </span>
        </div>
        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {rootDump.content}
        </p>
        <div className="mt-2 flex justify-end">
          <DeleteButton onDelete={handleDeleteRoot} label="Delete thread" />
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {replies.map((msg) => {
            const author = (msg.metadata?.author as string) || "nate";
            const isPebble = author === "pebble";
            return (
              <div
                key={msg.id}
                className={`group rounded-lg px-3 py-2.5 text-sm ${
                  isPebble
                    ? "bg-indigo-950/30 border border-indigo-800/30 text-indigo-200 ml-2"
                    : "bg-zinc-800/30 border border-zinc-700/30 text-zinc-300 mr-2"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-medium">
                    {isPebble ? "🤖 Pebble" : "👤 You"}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {timeAgo(msg.created_at)}
                  </span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteButton
                      onDelete={() => handleDeleteReply(msg.id)}
                    />
                  </span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            );
          })}
          <div ref={threadEndRef} />
        </div>
      )}

      {/* Reply input */}
      <form onSubmit={handleReply} className="space-y-2">
        <textarea
          ref={replyRef}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply to this thread..."
          rows={2}
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              handleReply(e);
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-600 hidden sm:inline">
            Cmd+Enter to send
          </span>
          <button
            type="submit"
            disabled={!reply.trim() || sending}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-200"
          >
            {sending ? (
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending
              </span>
            ) : (
              "Reply"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export function BrainDump({
  onSaved,
  refreshKey,
}: {
  onSaved?: () => void;
  refreshKey?: number;
}) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [recentDumps, setRecentDumps] = useState<BrainDumpItem[]>([]);
  const [loadingDumps, setLoadingDumps] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchRecentDumps = useCallback(async () => {
    try {
      const res = await fetch("/api/brain-dumps?limit=20");
      if (!res.ok) return;
      const json = await res.json();
      setRecentDumps(json.data || []);
    } catch {
      // silently fail
    } finally {
      setLoadingDumps(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentDumps();
  }, [fetchRecentDumps, refreshKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setStatus("sending");

    try {
      const res = await fetch("/api/brain-dumps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setStatus("sent");
      setContent("");
      onSaved?.();
      fetchRecentDumps();
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  const visibleDumps = showAll ? recentDumps : recentDumps.slice(0, 5);
  const hasMore = recentDumps.length > 5;

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Drop a thought, idea, or task for Pebble..."
          rows={3}
          className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              handleSubmit(e);
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600">
            {status === "sent" && (
              <span className="text-emerald-400">
                Saved to Pebble&apos;s brain
              </span>
            )}
            {status === "error" && (
              <span className="text-red-400">Failed to save. Try again.</span>
            )}
            {status === "idle" && (
              <span className="hidden sm:inline">Cmd+Enter to submit</span>
            )}
          </span>
          <button
            type="submit"
            disabled={!content.trim() || status === "sending"}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            {status === "sending" ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending
              </span>
            ) : (
              "Send to Pebble"
            )}
          </button>
        </div>
      </form>

      {(loadingDumps || recentDumps.length > 0) && (
        <div className="mt-5 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            Recent
          </p>
          {loadingDumps ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg border border-zinc-800/50 bg-zinc-900/30"
                />
              ))}
            </div>
          ) : (
            <>
              {visibleDumps.map((dump) => {
                const isExpanded = expandedId === dump.id;
                const isProcessed = dump.status === "processed";
                return (
                  <div
                    key={dump.id}
                    className={`rounded-lg border transition-all duration-200 ${
                      isExpanded
                        ? "border-zinc-700/50 bg-zinc-900/50 p-4"
                        : "border-zinc-800/50 bg-zinc-900/30 px-3 py-2.5 hover:bg-zinc-900/50"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : dump.id)
                      }
                      className="flex w-full items-start gap-2.5 text-left"
                    >
                      {/* Status indicator */}
                      <div className="mt-1 shrink-0">
                        {isProcessed ? (
                          <span
                            className="text-xs text-emerald-400"
                            title="Processed by Pebble"
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="relative flex h-1.5 w-1.5"
                            title="Pending"
                          >
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm leading-relaxed ${
                            isExpanded
                              ? "text-zinc-300"
                              : "text-zinc-400 line-clamp-2"
                          }`}
                        >
                          {isExpanded ? null : dump.content}
                        </p>
                      </div>

                      {/* Right side */}
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[10px] text-zinc-600">
                          {timeAgo(dump.created_at)}
                        </span>
                        <span className="text-zinc-600 text-xs">
                          {isExpanded ? "−" : "+"}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <ThreadView
                        rootDump={dump}
                        onReplySent={() => {
                          fetchRecentDumps();
                          onSaved?.();
                        }}
                        onDeleted={() => {
                          setExpandedId(null);
                          fetchRecentDumps();
                          onSaved?.();
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {hasMore && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full rounded-lg py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
                >
                  {showAll
                    ? "Show less"
                    : `Show ${recentDumps.length - 5} more`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

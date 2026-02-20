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

  const fetchRecentDumps = useCallback(async () => {
    try {
      const res = await fetch("/api/brain-dumps?limit=5");
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

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Drop a thought, idea, or task for Pebble..."
          rows={4}
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
            {status === "idle" && "Cmd+Enter to submit"}
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
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            Recent
          </p>
          {loadingDumps ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 animate-pulse rounded-lg border border-zinc-800/50 bg-zinc-900/30"
                />
              ))}
            </div>
          ) : (
            recentDumps.map((dump) => (
              <div
                key={dump.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-2 transition-colors duration-200"
              >
                {dump.status === "processed" ? (
                  <span
                    className="shrink-0 text-xs text-emerald-400"
                    title="Processed"
                  >
                    ✓
                  </span>
                ) : (
                  <span
                    className="relative flex h-1.5 w-1.5 shrink-0"
                    title="Pending"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                  </span>
                )}
                <span className="flex-1 truncate text-xs text-zinc-400">
                  {dump.content.length > 80
                    ? dump.content.slice(0, 80) + "..."
                    : dump.content}
                </span>
                <span className="shrink-0 text-[10px] text-zinc-600">
                  {timeAgo(dump.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

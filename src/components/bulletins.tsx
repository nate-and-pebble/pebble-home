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

export function Bulletins({ refreshKey }: { refreshKey?: number }) {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

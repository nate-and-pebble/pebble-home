"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Handoff {
  id: string;
  agent_id: string;
  content: string;
  created_at: string;
  metadata: {
    task_id?: string;
    state?: string;
    next?: string;
  } | null;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const POLL_INTERVAL = 15_000;

export function PendingHandoffs({ refreshKey }: { refreshKey?: number }) {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHandoffs = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/agent/journal?entry_type=handoff&limit=10"
      );
      if (!res.ok) return;
      const json = await res.json();
      setHandoffs(json.data || []);
    } catch {
      // keep showing last known state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHandoffs();
  }, [fetchHandoffs, refreshKey]);

  useEffect(() => {
    pollRef.current = setInterval(fetchHandoffs, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchHandoffs]);

  if (loading) {
    return (
      <div className="h-16 animate-pulse rounded-lg border border-zinc-800/50 bg-zinc-900/30" />
    );
  }

  if (handoffs.length === 0) {
    return (
      <p className="text-center text-xs text-zinc-700 py-4">
        No pending handoffs.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {handoffs.map((h) => {
        const next = h.metadata?.next || h.content;
        const state = h.metadata?.state;

        return (
          <div
            key={h.id}
            className="rounded-lg border border-amber-900/30 bg-amber-950/10 p-3"
          >
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-xs mt-0.5 shrink-0">~</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300">{next}</p>
                {state && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Left off: {state}
                  </p>
                )}
                <p className="text-[10px] text-zinc-600 mt-1">
                  {h.agent_id} &middot; {timeAgo(h.created_at)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

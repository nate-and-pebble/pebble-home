"use client";

import { useEffect, useState, useCallback } from "react";

interface ActivityItem {
  id: string;
  type: "brain_dump" | "task";
  icon: string;
  text: string;
  time: string;
  status: string;
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

export function ActivityFeed({ refreshKey }: { refreshKey?: number }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/activity?limit=10");
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border border-zinc-800/50 bg-zinc-900/30"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-xs text-zinc-700 py-8">
        No activity yet. Drop a brain dump to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={`${item.type}-${item.id}`}
          className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 transition-colors duration-200 hover:bg-zinc-900/50"
        >
          <span className="mt-0.5 text-sm">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300">{item.text}</p>
            <p className="text-xs text-zinc-600">{timeAgo(item.time)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

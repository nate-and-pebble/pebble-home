"use client";

import { useEffect, useState, useCallback } from "react";

interface ActivityItem {
  id: string;
  type: "brain_dump" | "task" | "bulletin" | "agent_run";
  icon: string;
  text: string;
  time: string;
  status: string;
  detail: {
    fullContent?: string;
    metadata?: Record<string, unknown>;
    summary?: string;
    agent_id?: string;
    priority?: string;
    description?: string;
    logCount?: number;
  };
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

const typeLabels: Record<string, string> = {
  brain_dump: "Brain Dump",
  task: "Task",
  bulletin: "Bulletin",
  agent_run: "Agent Run",
};

const statusStyles: Record<string, string> = {
  new: "bg-amber-900/50 text-amber-300",
  processed: "bg-emerald-900/50 text-emerald-300",
  todo: "bg-zinc-700 text-zinc-300",
  in_progress: "bg-blue-900/50 text-blue-300",
  done: "bg-emerald-900/50 text-emerald-300",
  running: "bg-emerald-900/50 text-emerald-300",
  completed: "bg-zinc-700 text-zinc-300",
  failed: "bg-red-900/50 text-red-300",
  expired: "bg-amber-900/50 text-amber-300",
  read: "bg-zinc-700 text-zinc-300",
};

function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || "bg-zinc-700 text-zinc-300";
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${style}`}
    >
      {status}
    </span>
  );
}

function ExpandedDetail({ item }: { item: ActivityItem }) {
  const { detail, type } = item;

  return (
    <div className="mt-2 space-y-1.5 border-t border-zinc-800/50 pt-2">
      {/* Full content for brain dumps and bulletins */}
      {detail.fullContent ? (
        <p className="text-xs text-zinc-400 whitespace-pre-wrap">
          {detail.fullContent}
        </p>
      ) : null}

      {/* Description for tasks */}
      {detail.description ? (
        <p className="text-xs text-zinc-400">{detail.description}</p>
      ) : null}

      {/* Priority for tasks */}
      {detail.priority ? (
        <p className="text-[10px] text-zinc-500">
          Priority: {String(detail.priority)}
        </p>
      ) : null}

      {/* Agent run details */}
      {type === "agent_run" && detail.agent_id ? (
        <p className="text-[10px] text-zinc-500">
          Agent: {String(detail.agent_id)}
          {detail.logCount !== undefined && detail.logCount > 0
            ? ` · ${detail.logCount} log entries`
            : ""}
        </p>
      ) : null}

      {/* Linked items from metadata */}
      {detail.metadata?.spawned_tasks ? (
        <p className="text-[10px] text-zinc-500">
          Spawned tasks:{" "}
          {(detail.metadata.spawned_tasks as string[]).join(", ")}
        </p>
      ) : null}

      {detail.metadata?.source_brain_dump ? (
        <p className="text-[10px] text-zinc-500">
          From brain dump:{" "}
          {String(detail.metadata.source_brain_dump).slice(0, 8)}
        </p>
      ) : null}

      {detail.metadata?.reply_to_title ? (
        <p className="text-[10px] text-zinc-500">
          Reply to: {String(detail.metadata.reply_to_title)}
        </p>
      ) : null}
    </div>
  );
}

export function ActivityFeed({ refreshKey }: { refreshKey?: number }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/activity?limit=15");
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
    <div className="space-y-2">
      {items.map((item) => {
        const key = `${item.type}-${item.id}`;
        const isExpanded = expanded === key;

        return (
          <button
            key={key}
            onClick={() => setExpanded(isExpanded ? null : key)}
            className="w-full text-left rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 transition-colors duration-200 hover:bg-zinc-900/50"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-sm shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600 shrink-0">
                    {typeLabels[item.type]}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-sm text-zinc-300 mt-0.5">
                  {item.text}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {timeAgo(item.time)}
                </p>
              </div>
              <span className="text-zinc-600 text-xs mt-1 shrink-0">
                {isExpanded ? "−" : "+"}
              </span>
            </div>

            {isExpanded && <ExpandedDetail item={item} />}
          </button>
        );
      })}
    </div>
  );
}

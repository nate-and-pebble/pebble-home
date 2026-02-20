"use client";

import { useEffect, useState, useCallback } from "react";

interface AgentRun {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  heartbeat_at: string;
  completed_at: string | null;
  summary: string | null;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  running: {
    label: "Running",
    className: "bg-emerald-900/50 text-emerald-300",
  },
  completed: {
    label: "Done",
    className: "bg-zinc-700 text-zinc-300",
  },
  failed: {
    label: "Failed",
    className: "bg-red-900/50 text-red-300",
  },
  expired: {
    label: "Expired",
    className: "bg-amber-900/50 text-amber-300",
  },
};

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

export function AgentRuns({ refreshKey }: { refreshKey?: number }) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/runs?limit=10");
      if (!res.ok) return;
      const json = await res.json();
      setRuns(json.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns, refreshKey]);

  async function toggleExpand(runId: string) {
    if (expanded === runId) {
      setExpanded(null);
      return;
    }
    setExpanded(runId);
    if (!logs[runId]) {
      try {
        const res = await fetch(`/api/agent/runs/${runId}/log`);
        if (res.ok) {
          const json = await res.json();
          setLogs((prev) => ({ ...prev, [runId]: json.data || [] }));
        }
      } catch {
        // silently fail
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg border border-zinc-800/50 bg-zinc-900/30"
          />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <p className="text-center text-xs text-zinc-700 py-6">
        No agent runs yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const style = statusStyles[run.status] || statusStyles.completed;
        const isExpanded = expanded === run.id;
        const runLogs = logs[run.id] || [];

        return (
          <div key={run.id}>
            <button
              onClick={() => toggleExpand(run.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 text-left transition-colors duration-200 hover:bg-zinc-900/50"
            >
              <div
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  run.status === "running"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-zinc-600"
                }`}
              />
              <span className="flex-1 text-sm text-zinc-300 truncate">
                {run.agent_id}
              </span>
              <span className="text-[10px] text-zinc-600 shrink-0">
                {timeAgo(run.started_at)}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${style.className}`}
              >
                {style.label}
              </span>
            </button>

            {isExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l border-zinc-800/50 pl-3 pb-2">
                {run.summary && (
                  <p className="text-xs text-zinc-400">{run.summary}</p>
                )}
                {runLogs.length === 0 && (
                  <p className="text-[10px] text-zinc-600">No log entries.</p>
                )}
                {runLogs.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2">
                    <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">
                      {entryIcon(entry.entry_type)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {entry.content}
                    </span>
                    <span className="text-[10px] text-zinc-700 shrink-0 ml-auto">
                      {timeAgo(entry.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface LogEntry {
  id: string;
  entry_type: string;
  content: string;
  created_at: string;
}

function entryIcon(type: string): string {
  switch (type) {
    case "action":
      return ">";
    case "decision":
      return "?";
    case "handoff":
      return "~";
    case "error":
      return "!";
    case "claim":
      return "+";
    case "release":
      return "-";
    default:
      return "*";
  }
}

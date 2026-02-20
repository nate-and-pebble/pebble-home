"use client";

import { useEffect, useState, useCallback } from "react";

interface Stats {
  brainDumps: number;
  tasksDone: number;
  activeAgentRuns: number;
  lastRunAt: string | null;
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

export function StatsCards({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const json = await res.json();
      const lastRunTime = json.lastRun?.completed_at || json.lastRun?.started_at || null;
      setStats({
        brainDumps: json.counts.brainDumps,
        tasksDone: json.counts.tasksDone,
        activeAgentRuns: json.counts.activeAgentRuns || 0,
        lastRunAt: lastRunTime,
      });
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchStats();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchStats, refreshKey]);

  const cards = [
    { label: "Brain Dumps", value: stats ? String(stats.brainDumps) : "—" },
    { label: "Tasks Done", value: stats ? String(stats.tasksDone) : "—" },
    {
      label: "Last Heartbeat",
      value: stats
        ? stats.lastRunAt
          ? timeAgo(stats.lastRunAt)
          : "Never"
        : "—",
    },
    {
      label: "Active Runs",
      value: stats ? String(stats.activeAgentRuns) : "—",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((stat, i) => (
        <div
          key={i}
          className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 text-center"
        >
          <p className="text-lg font-semibold text-zinc-200">{stat.value}</p>
          <p className="text-xs text-zinc-600">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

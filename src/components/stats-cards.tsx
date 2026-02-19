"use client";

import { useEffect, useState, useCallback } from "react";

interface Stats {
  brainDumps: number;
  tasksDone: number;
  uptime: string;
}

export function StatsCards({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const json = await res.json();
      setStats({
        brainDumps: json.counts.brainDumps,
        tasksDone: json.counts.tasksDone,
        uptime: json.uptime,
      });
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  const cards = [
    { label: "Brain Dumps", value: stats ? String(stats.brainDumps) : "—" },
    { label: "Tasks Done", value: stats ? String(stats.tasksDone) : "—" },
    { label: "Uptime", value: stats?.uptime || "—" },
    { label: "Sync", value: stats ? "Live" : "..." },
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

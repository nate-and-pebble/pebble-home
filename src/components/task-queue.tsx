"use client";

import { useEffect, useState, useCallback } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-zinc-500",
};

const statusBadges: Record<string, { label: string; className: string }> = {
  todo: { label: "To Do", className: "bg-zinc-700 text-zinc-300" },
  in_progress: {
    label: "In Progress",
    className: "bg-indigo-900/50 text-indigo-300",
  },
  done: { label: "Done", className: "bg-emerald-900/50 text-emerald-300" },
};

export function TaskQueue({ refreshKey }: { refreshKey?: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?limit=10");
      if (!res.ok) return;
      const json = await res.json();
      setTasks(json.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshKey]);

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

  if (tasks.length === 0) {
    return (
      <p className="text-center text-xs text-zinc-700 py-6">
        No tasks yet. Create one via the API or CLI.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const badge = statusBadges[task.status] || statusBadges.todo;
        return (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 transition-colors duration-200 hover:bg-zinc-900/50"
          >
            <div
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}
            />
            <span className="flex-1 text-sm text-zinc-300 truncate">
              {task.title}
            </span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

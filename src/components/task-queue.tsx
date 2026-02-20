"use client";

import { useEffect, useState, useCallback } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  assigned_agent: string | null;
  claim_expires_at: string | null;
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

const statusCycle: string[] = ["todo", "in_progress", "done"];
const priorityCycle: string[] = ["low", "medium", "high", "urgent"];

export function TaskQueue({
  refreshKey,
  onTaskCreated,
}: {
  refreshKey?: number;
  onTaskCreated?: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

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

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          priority: newPriority,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setNewTitle("");
      setNewPriority("medium");
      fetchTasks();
      onTaskCreated?.();
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(task: Task) {
    const currentIndex = statusCycle.indexOf(task.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      onTaskCreated?.();
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: task.status } : t
        )
      );
    }
  }

  async function handlePriorityChange(task: Task) {
    const currentIndex = priorityCycle.indexOf(task.priority);
    const nextPriority =
      priorityCycle[(currentIndex + 1) % priorityCycle.length];

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, priority: nextPriority } : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: nextPriority }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, priority: task.priority } : t
        )
      );
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

  return (
    <div className="space-y-2">
      <form onSubmit={handleCreateTask} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Quick add task..."
          className="flex-1 min-w-[140px] rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
        />
        <div className="flex gap-2">
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-2 text-xs text-zinc-400 transition-all duration-200 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
          >
            <option value="low">Low</option>
            <option value="medium">Med</option>
            <option value="high">High</option>
            <option value="urgent">Urg</option>
          </select>
          <button
            type="submit"
            disabled={!newTitle.trim() || creating}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            {creating ? "..." : "+"}
          </button>
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="text-center text-xs text-zinc-700 py-6">
          No tasks yet.
        </p>
      ) : (
        tasks.map((task) => {
          const badge = statusBadges[task.status] || statusBadges.todo;
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 transition-colors duration-200 hover:bg-zinc-900/50"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePriorityChange(task);
                }}
                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200 hover:scale-150 ${priorityColors[task.priority] || priorityColors.medium}`}
                title={`Priority: ${task.priority} (click to cycle)`}
              />
              <span className="flex-1 text-sm text-zinc-300 truncate">
                {task.title}
                {task.assigned_agent && (
                  <span className="ml-1.5 text-[10px] text-indigo-400/70">
                    {task.assigned_agent}
                  </span>
                )}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(task);
                }}
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all duration-200 hover:brightness-125 active:scale-95 cursor-pointer ${badge.className}`}
                title={`Status: ${badge.label} (click to cycle)`}
              >
                {badge.label}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

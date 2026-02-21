"use client";

import { useEffect, useState, useCallback } from "react";

interface Task {
  id: string;
  title: string;
  description: string | null;
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

const priorityLabels: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Med",
  low: "Low",
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?limit=20");
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

  async function handleDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setConfirmDeleteId(null);
    setExpandedId(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      onTaskCreated?.();
    } catch {
      fetchTasks();
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border border-zinc-800/50 bg-zinc-900/30"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Add task form */}
      <form onSubmit={handleCreateTask} className="space-y-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
        />
        {newTitle.trim() && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {priorityCycle.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewPriority(p)}
                  className={`rounded px-2 py-1 text-[10px] font-medium transition-all ${
                    newPriority === p
                      ? p === "urgent" || p === "high"
                        ? "bg-red-900/50 text-red-300"
                        : p === "medium"
                          ? "bg-amber-900/50 text-amber-300"
                          : "bg-zinc-700 text-zinc-300"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              {creating ? "..." : "Add"}
            </button>
          </div>
        )}
      </form>

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="text-center text-xs text-zinc-700 py-6">
          No tasks yet.
        </p>
      ) : (
        tasks.map((task) => {
          const badge = statusBadges[task.status] || statusBadges.todo;
          const isExpanded = expandedId === task.id;
          const isConfirmingDelete = confirmDeleteId === task.id;

          return (
            <div
              key={task.id}
              className={`rounded-lg border transition-all duration-200 ${
                isExpanded
                  ? "border-zinc-700/50 bg-zinc-900/50"
                  : "border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/50"
              }`}
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : task.id)}
              >
                {/* Priority dot */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePriorityChange(task);
                  }}
                  className={`h-2 w-2 shrink-0 rounded-full transition-all duration-200 hover:scale-150 ${priorityColors[task.priority] || priorityColors.medium}`}
                  title={`Priority: ${task.priority} (click to cycle)`}
                />

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-zinc-300 ${isExpanded ? "" : "truncate"}`}>
                    {task.title}
                  </p>
                  {!isExpanded && task.assigned_agent && (
                    <span className="text-[10px] text-indigo-400/70">
                      {task.assigned_agent}
                    </span>
                  )}
                </div>

                {/* Status badge */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(task);
                  }}
                  className={`shrink-0 rounded px-2 py-1 text-[10px] font-medium transition-all duration-200 hover:brightness-125 active:scale-95 cursor-pointer ${badge.className}`}
                  title={`Status: ${badge.label} (click to cycle)`}
                >
                  {badge.label}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-zinc-800/50 px-3 py-2.5 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                    <span>Priority: {task.priority}</span>
                    <span>{timeAgo(task.created_at)}</span>
                    {task.assigned_agent && (
                      <span>Agent: {task.assigned_agent}</span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-zinc-400 whitespace-pre-wrap break-words">
                      {task.description}
                    </p>
                  )}
                  <div className="flex justify-end pt-1">
                    {isConfirmingDelete ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(task.id);
                          }}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-900/50 text-red-300 hover:bg-red-900/80 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(task.id);
                        }}
                        className="rounded px-1.5 py-0.5 text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-indigo-900/50 text-indigo-300" },
  paused: { label: "Paused", className: "bg-amber-900/50 text-amber-300" },
  done: { label: "Done", className: "bg-emerald-900/50 text-emerald-300" },
};

const statusCycle: string[] = ["active", "paused", "done"];
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

type FilterStatus = "all" | "active" | "paused" | "done";
type SortBy = "priority" | "created" | "updated";

export function GoalsManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("priority");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newNextAction, setNewNextAction] = useState("");
  const [creating, setCreating] = useState(false);

  // Expand / edit / delete
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{
    title: string;
    description: string;
    next_action: string;
  }>({ title: "", description: "", next_action: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50", sort: sortBy });
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/goals?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      setGoals(json.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterStatus, sortBy]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // --- Create ---
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: newTitle.trim(),
        priority: newPriority,
      };
      if (newDescription.trim()) body.description = newDescription.trim();
      if (newNextAction.trim()) {
        body.metadata = { next_action: newNextAction.trim() };
      }
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      setNewNextAction("");
      setShowCreate(false);
      fetchGoals();
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }

  // --- Status cycle ---
  async function handleStatusChange(goal: Goal, newStatus?: string) {
    const nextStatus =
      newStatus ||
      statusCycle[(statusCycle.indexOf(goal.status) + 1) % statusCycle.length];

    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, status: nextStatus } : g))
    );

    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id ? { ...g, status: goal.status } : g
        )
      );
    }
  }

  // --- Priority cycle ---
  async function handlePriorityChange(goal: Goal) {
    const nextPriority =
      priorityCycle[
        (priorityCycle.indexOf(goal.priority) + 1) % priorityCycle.length
      ];

    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, priority: nextPriority } : g
      )
    );

    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: nextPriority }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id ? { ...g, priority: goal.priority } : g
        )
      );
    }
  }

  // --- Edit ---
  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditFields({
      title: goal.title,
      description: goal.description || "",
      next_action: (goal.metadata?.next_action as string) || "",
    });
  }

  async function saveEdit(goal: Goal) {
    const body: Record<string, unknown> = {};
    if (editFields.title.trim() !== goal.title) {
      body.title = editFields.title.trim();
    }
    const newDesc = editFields.description.trim() || null;
    if (newDesc !== (goal.description || null)) {
      body.description = newDesc;
    }
    const newAction = editFields.next_action.trim() || null;
    const oldAction = (goal.metadata?.next_action as string) || null;
    if (newAction !== oldAction) {
      body.metadata = { ...goal.metadata, next_action: newAction };
    }

    if (Object.keys(body).length === 0) {
      setEditingId(null);
      return;
    }

    // Optimistic update
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id
          ? {
              ...g,
              title: editFields.title.trim() || g.title,
              description: newDesc,
              metadata: newAction !== oldAction
                ? { ...g.metadata, next_action: newAction }
                : g.metadata,
            }
          : g
      )
    );
    setEditingId(null);

    try {
      const res = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      fetchGoals();
    }
  }

  // --- Delete ---
  async function handleDelete(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setConfirmDeleteId(null);
    setExpandedId(null);
    try {
      const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    } catch {
      fetchGoals();
    }
  }

  // --- Render ---
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/30"
          />
        ))}
      </div>
    );
  }

  const nextAction = (g: Goal) => (g.metadata?.next_action as string) || null;

  return (
    <div className="space-y-6">
      {/* Toolbar: filters + create button */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-0.5">
          {(["all", "active", "paused", "done"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                filterStatus === s
                  ? "bg-zinc-700/80 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s === "all" ? "All" : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-2 py-1.5 text-[11px] text-zinc-400 focus:border-indigo-500/50 focus:outline-none"
        >
          <option value="priority">Sort: Priority</option>
          <option value="created">Sort: Newest</option>
          <option value="updated">Sort: Updated</option>
        </select>

        <div className="flex-1" />

        {/* Create button */}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-indigo-500 active:scale-[0.97]"
        >
          {showCreate ? "Cancel" : "+ New Goal"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Goal title *"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
            autoFocus
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25 resize-none"
          />
          <input
            type="text"
            value={newNextAction}
            onChange={(e) => setNewNextAction(e.target.value)}
            placeholder="Next action (optional)"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
          />
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
              disabled={creating || !newTitle.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
            >
              {creating ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-600">
          No goals{filterStatus !== "all" ? ` with status "${filterStatus}"` : ""}.
        </p>
      ) : (
        <div className="space-y-2">
          {goals.map((goal) => {
            const badge = statusConfig[goal.status] || statusConfig.active;
            const isExpanded = expandedId === goal.id;
            const isEditing = editingId === goal.id;
            const isConfirmingDelete = confirmDeleteId === goal.id;
            const action = nextAction(goal);

            return (
              <div
                key={goal.id}
                className={`rounded-xl border transition-all duration-200 ${
                  isExpanded
                    ? "border-zinc-700/50 bg-zinc-900/50"
                    : "border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/50"
                } ${goal.status === "done" ? "opacity-60" : ""}`}
              >
                {/* Row */}
                <div
                  className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : goal.id);
                    if (isExpanded) {
                      setEditingId(null);
                      setConfirmDeleteId(null);
                    }
                  }}
                >
                  {/* Priority dot */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePriorityChange(goal);
                    }}
                    className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all hover:scale-150 ${priorityColors[goal.priority] || priorityColors.medium}`}
                    title={`Priority: ${goal.priority} (click to cycle)`}
                  />

                  {/* Title + next action */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        goal.status === "done"
                          ? "text-zinc-500 line-through"
                          : "text-zinc-200"
                      } ${isExpanded ? "" : "truncate"}`}
                    >
                      {goal.title}
                    </p>
                    {!isExpanded && action && (
                      <p className="mt-0.5 text-[11px] text-zinc-500 truncate">
                        Next: {action}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(goal);
                    }}
                    className={`shrink-0 rounded px-2 py-1 text-[10px] font-medium transition-all hover:brightness-125 active:scale-95 cursor-pointer ${badge.className}`}
                    title={`Status: ${badge.label} (click to cycle)`}
                  >
                    {badge.label}
                  </button>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-zinc-800/50 px-3 sm:px-4 py-3 space-y-3">
                    {isEditing ? (
                      /* Edit mode */
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editFields.title}
                          onChange={(e) =>
                            setEditFields({ ...editFields, title: e.target.value })
                          }
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500/50 focus:outline-none"
                          placeholder="Title"
                        />
                        <textarea
                          value={editFields.description}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              description: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500/50 focus:outline-none resize-none"
                          placeholder="Description"
                        />
                        <input
                          type="text"
                          value={editFields.next_action}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              next_action: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500/50 focus:outline-none"
                          placeholder="Next action"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(goal)}
                            className="rounded bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-500 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <>
                        {goal.description && (
                          <p className="text-xs text-zinc-400 whitespace-pre-wrap">
                            {goal.description}
                          </p>
                        )}
                        {action && (
                          <div className="text-xs">
                            <span className="text-zinc-500">Next action: </span>
                            <span className="text-zinc-300">{action}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                          <span>Priority: {goal.priority}</span>
                          <span>Created {timeAgo(goal.created_at)}</span>
                          <span>Updated {timeAgo(goal.updated_at)}</span>
                        </div>

                        {/* Quick status buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {statusCycle.map((s) => (
                            <button
                              key={s}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (s !== goal.status)
                                  handleStatusChange(goal, s);
                              }}
                              className={`rounded px-2 py-1 text-[10px] font-medium transition-all ${
                                s === goal.status
                                  ? statusConfig[s]?.className
                                  : "text-zinc-600 hover:text-zinc-400 border border-zinc-800/50"
                              }`}
                            >
                              {statusConfig[s]?.label || s}
                            </button>
                          ))}
                        </div>

                        {/* Action bar */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(goal);
                            }}
                            className="rounded px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            Edit
                          </button>
                          {isConfirmingDelete ? (
                            <span className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(goal.id);
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
                                setConfirmDeleteId(goal.id);
                              }}
                              className="rounded px-2 py-0.5 text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

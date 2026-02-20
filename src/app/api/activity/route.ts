import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

interface ActivityItem {
  id: string;
  type: "brain_dump" | "task" | "bulletin" | "agent_run";
  icon: string;
  text: string;
  time: string;
  status: string;
  created_at: string;
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

// GET /api/activity - combined feed with expandable details
export const GET = withAuth(async (req: NextRequest) => {
  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

  const [brainDumps, tasks, bulletins, agentRuns] = await Promise.all([
    getSupabase()
      .from("brain_dumps")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    getSupabase()
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    getSupabase()
      .from("bulletins")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    getSupabase()
      .from("agent_runs")
      .select("*, run_log(id)")
      .order("started_at", { ascending: false })
      .limit(limit),
  ]);

  if (brainDumps.error) {
    return NextResponse.json(
      { error: brainDumps.error.message },
      { status: 500 }
    );
  }
  if (tasks.error) {
    return NextResponse.json(
      { error: tasks.error.message },
      { status: 500 }
    );
  }
  if (bulletins.error) {
    return NextResponse.json(
      { error: bulletins.error.message },
      { status: 500 }
    );
  }
  if (agentRuns.error) {
    return NextResponse.json(
      { error: agentRuns.error.message },
      { status: 500 }
    );
  }

  // Build a set of brain dump IDs that are linked to tasks (via metadata.source_brain_dump)
  const tasksByBrainDump = new Map<string, string[]>();
  for (const t of tasks.data || []) {
    const source = t.metadata?.source_brain_dump;
    if (source) {
      const existing = tasksByBrainDump.get(source) || [];
      existing.push(t.title);
      tasksByBrainDump.set(source, existing);
    }
  }

  const activity: ActivityItem[] = [];

  for (const bd of brainDumps.data || []) {
    const preview =
      bd.content.length > 60
        ? bd.content.slice(0, 60) + "..."
        : bd.content;
    const linkedTasks = tasksByBrainDump.get(bd.id);
    activity.push({
      id: bd.id,
      type: "brain_dump",
      icon: bd.status === "processed" ? "✅" : "🧠",
      text: preview,
      time: bd.created_at,
      status: bd.status,
      created_at: bd.created_at,
      detail: {
        fullContent: bd.content,
        metadata: {
          ...bd.metadata,
          ...(linkedTasks ? { spawned_tasks: linkedTasks } : {}),
        },
      },
    });
  }

  for (const t of tasks.data || []) {
    const icon =
      t.status === "done" ? "✅" : t.status === "in_progress" ? "🔄" : "📋";
    activity.push({
      id: t.id,
      type: "task",
      icon,
      text: t.title,
      time: t.created_at,
      status: t.status,
      created_at: t.created_at,
      detail: {
        description: t.description || undefined,
        priority: t.priority,
        metadata: t.metadata,
      },
    });
  }

  for (const b of bulletins.data || []) {
    activity.push({
      id: b.id,
      type: "bulletin",
      icon: b.status === "new" ? "📢" : "📋",
      text: b.title,
      time: b.created_at,
      status: b.status,
      created_at: b.created_at,
      detail: {
        fullContent: b.content || undefined,
        metadata: b.metadata,
      },
    });
  }

  for (const r of agentRuns.data || []) {
    const icon =
      r.status === "running"
        ? "🤖"
        : r.status === "completed"
          ? "✅"
          : r.status === "failed"
            ? "❌"
            : "⚠️";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logCount = Array.isArray((r as any).run_log) ? (r as any).run_log.length : 0;
    activity.push({
      id: r.id,
      type: "agent_run",
      icon,
      text: r.summary || `Agent run (${r.agent_id})`,
      time: r.started_at,
      status: r.status,
      created_at: r.started_at,
      detail: {
        agent_id: r.agent_id,
        summary: r.summary || undefined,
        logCount,
      },
    });
  }

  // Sort by created_at descending
  activity.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ data: activity.slice(0, limit) });
});

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

// GET /api/agent/context - full coordination context for an agent starting work
export const GET = withAuth(async () => {
  const now = new Date().toISOString();

  const [activeRuns, recentRuns, journal, availableTasks, claimedTasks] =
    await Promise.all([
      // Currently running agent runs
      getSupabase()
        .from("agent_runs")
        .select("*")
        .eq("status", "running")
        .order("started_at", { ascending: false }),

      // Recent completed/failed runs (last 10)
      getSupabase()
        .from("agent_runs")
        .select("*")
        .neq("status", "running")
        .order("started_at", { ascending: false })
        .limit(10),

      // Recent journal entries (last 30)
      getSupabase()
        .from("run_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),

      // Tasks that are available (unclaimed or claim expired, not done)
      getSupabase()
        .from("tasks")
        .select("*")
        .neq("status", "done")
        .or(`assigned_agent.is.null,claim_expires_at.lt.${now}`)
        .order("created_at", { ascending: false }),

      // Tasks currently claimed by an agent
      getSupabase()
        .from("tasks")
        .select("*")
        .not("assigned_agent", "is", null)
        .gte("claim_expires_at", now)
        .order("created_at", { ascending: false }),
    ]);

  return NextResponse.json({
    active_runs: activeRuns.data || [],
    recent_runs: recentRuns.data || [],
    recent_journal: journal.data || [],
    available_tasks: availableTasks.data || [],
    claimed_tasks: claimedTasks.data || [],
    timestamp: now,
  });
});

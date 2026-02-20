import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

const startTime = Date.now();

// Probe a table by selecting 0 rows. Returns null if ok, or the table name if missing.
async function probeTable(table: string): Promise<string | null> {
  const { error } = await getSupabase()
    .from(table)
    .select("id", { count: "exact", head: true })
    .limit(0);
  if (error && /schema cache|relation.*does not exist/i.test(error.message)) {
    return table;
  }
  return null;
}

// Probe a column by selecting it. Returns "table.column" if missing, null if ok.
async function probeColumn(table: string, column: string): Promise<string | null> {
  const { error } = await getSupabase()
    .from(table)
    .select(column)
    .limit(0);
  if (error && /column|schema cache|does not exist/i.test(error.message)) {
    return `${table}.${column}`;
  }
  return null;
}

const REQUIRED_TABLES = ["brain_dumps", "tasks", "bulletins", "agent_runs", "run_log"];
const REQUIRED_COLUMNS: [string, string][] = [
  ["tasks", "assigned_agent"],
  ["tasks", "claim_run_id"],
  ["tasks", "claim_expires_at"],
];

// GET /api/status - health/stats + schema check
export const GET = withAuth(async () => {
  // Schema probe — run all checks in parallel
  const tableProbes = REQUIRED_TABLES.map(probeTable);
  const columnProbes = REQUIRED_COLUMNS.map(([t, c]) => probeColumn(t, c));
  const probeResults = await Promise.all([...tableProbes, ...columnProbes]);
  const missing = probeResults.filter(Boolean) as string[];
  const schemaOk = missing.length === 0;

  // Stats — only query tables that exist
  const missingTables = new Set(missing.filter((m) => !m.includes(".")));
  const safeCount = async (table: string, filter?: { col: string; val: string }) => {
    if (missingTables.has(table)) return 0;
    let q = getSupabase().from(table).select("*", { count: "exact", head: true });
    if (filter) q = q.eq(filter.col, filter.val);
    const { count } = await q;
    return count || 0;
  };

  const [brainDumps, totalTasks, tasksDone, totalBulletins, unreadBulletins, activeAgentRuns, lastRunResult] =
    await Promise.all([
      safeCount("brain_dumps"),
      safeCount("tasks"),
      safeCount("tasks", { col: "status", val: "done" }),
      safeCount("bulletins"),
      safeCount("bulletins", { col: "status", val: "new" }),
      safeCount("agent_runs", { col: "status", val: "running" }),
      missingTables.has("agent_runs")
        ? Promise.resolve({ data: null })
        : getSupabase()
            .from("agent_runs")
            .select("started_at, completed_at, agent_id, status, summary")
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

  const lastRun = lastRunResult?.data || null;

  // Fetch latest journal entry for live activity display
  let latestJournal = null;
  if (!missingTables.has("run_log")) {
    const { data: journalData } = await getSupabase()
      .from("run_log")
      .select("content, entry_type, agent_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestJournal = journalData || null;
  }

  const uptimeMs = Date.now() - startTime;
  const uptimeHours = Math.floor(uptimeMs / 3600000);
  const uptimeMinutes = Math.floor((uptimeMs % 3600000) / 60000);

  return NextResponse.json({
    status: schemaOk ? "ok" : "degraded",
    schema_ok: schemaOk,
    missing,
    uptime: `${uptimeHours}h ${uptimeMinutes}m`,
    uptimeMs,
    counts: {
      brainDumps,
      totalTasks,
      tasksDone,
      totalBulletins,
      unreadBulletins,
      activeAgentRuns,
    },
    lastRun: lastRun
      ? {
          agent_id: lastRun.agent_id,
          status: lastRun.status,
          started_at: lastRun.started_at,
          completed_at: lastRun.completed_at,
          summary: lastRun.summary,
        }
      : null,
    latestJournal,
    timestamp: new Date().toISOString(),
  });
});

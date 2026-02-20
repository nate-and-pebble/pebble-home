import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

const startTime = Date.now();

// GET /api/status - health/stats
export const GET = withAuth(async () => {
  const [brainDumps, totalTasks, doneTasks, totalBulletins, unreadBulletins] = await Promise.all([
    getSupabase()
      .from("brain_dumps")
      .select("*", { count: "exact", head: true }),
    getSupabase()
      .from("tasks")
      .select("*", { count: "exact", head: true }),
    getSupabase()
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "done"),
    getSupabase()
      .from("bulletins")
      .select("*", { count: "exact", head: true }),
    getSupabase()
      .from("bulletins")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  const uptimeMs = Date.now() - startTime;
  const uptimeHours = Math.floor(uptimeMs / 3600000);
  const uptimeMinutes = Math.floor((uptimeMs % 3600000) / 60000);

  return NextResponse.json({
    status: "ok",
    uptime: `${uptimeHours}h ${uptimeMinutes}m`,
    uptimeMs,
    counts: {
      brainDumps: brainDumps.count || 0,
      totalTasks: totalTasks.count || 0,
      tasksDone: doneTasks.count || 0,
      totalBulletins: totalBulletins.count || 0,
      unreadBulletins: unreadBulletins.count || 0,
    },
    timestamp: new Date().toISOString(),
  });
});

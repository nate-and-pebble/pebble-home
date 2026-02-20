import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

// GET /api/agent/journal - recent journal entries across all runs
export const GET = withAuth(async (req: NextRequest) => {
  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 100);
  const agentId = url.searchParams.get("agent_id");
  const entryType = url.searchParams.get("entry_type");

  let query = getSupabase()
    .from("run_log")
    .select("*, agent_runs!inner(agent_id, status, started_at)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (agentId) query = query.eq("agent_id", agentId);
  if (entryType) query = query.eq("entry_type", entryType);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
});

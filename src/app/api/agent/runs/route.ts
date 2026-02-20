import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

const DEFAULT_LEASE_MINUTES = 10;

// POST /api/agent/runs - start a new agent run
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { agent_id, lease_duration_minutes, metadata } = body;

  if (!agent_id || typeof agent_id !== "string") {
    return NextResponse.json(
      { error: "agent_id is required" },
      { status: 400 }
    );
  }

  const leaseMinutes = lease_duration_minutes || DEFAULT_LEASE_MINUTES;
  const now = new Date();
  const leaseExpires = new Date(now.getTime() + leaseMinutes * 60 * 1000);

  // Expire stale runs (lease expired, still marked running)
  await getSupabase()
    .from("agent_runs")
    .update({ status: "expired", completed_at: now.toISOString() })
    .eq("status", "running")
    .lt("lease_expires_at", now.toISOString());

  // Release expired task claims
  await getSupabase()
    .from("tasks")
    .update({
      assigned_agent: null,
      claim_run_id: null,
      claim_expires_at: null,
    })
    .not("assigned_agent", "is", null)
    .lt("claim_expires_at", now.toISOString());

  // Create the run
  const { data, error } = await getSupabase()
    .from("agent_runs")
    .insert({
      agent_id,
      status: "running",
      started_at: now.toISOString(),
      heartbeat_at: now.toISOString(),
      lease_expires_at: leaseExpires.toISOString(),
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch recent journal entries for context
  const { data: journal } = await getSupabase()
    .from("run_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ run: data, recent_journal: journal || [] }, { status: 201 });
});

// GET /api/agent/runs - list recent runs
export const GET = withAuth(async (req: NextRequest) => {
  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const agentId = url.searchParams.get("agent_id");
  const status = url.searchParams.get("status");

  let query = getSupabase()
    .from("agent_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (agentId) query = query.eq("agent_id", agentId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
});

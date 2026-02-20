import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

const DEFAULT_LEASE_MINUTES = 10;

// GET /api/agent/runs/:id - get a single run with its log
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const [runResult, logResult] = await Promise.all([
      getSupabase().from("agent_runs").select("*").eq("id", id).single(),
      getSupabase()
        .from("run_log")
        .select("*")
        .eq("run_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (runResult.error) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      run: runResult.data,
      log: logResult.data || [],
    });
  }
);

// PATCH /api/agent/runs/:id - update run (heartbeat, complete, fail)
export const PATCH = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();
    const { status, summary, heartbeat, lease_duration_minutes, metadata } = body;

    const updates: Record<string, unknown> = {};
    const now = new Date();

    if (heartbeat) {
      const leaseMinutes = lease_duration_minutes || DEFAULT_LEASE_MINUTES;
      updates.heartbeat_at = now.toISOString();
      updates.lease_expires_at = new Date(
        now.getTime() + leaseMinutes * 60 * 1000
      ).toISOString();
    }

    if (status) {
      updates.status = status;
      if (status === "completed" || status === "failed") {
        updates.completed_at = now.toISOString();

        // Release all task claims held by this run
        await getSupabase()
          .from("tasks")
          .update({
            assigned_agent: null,
            claim_run_id: null,
            claim_expires_at: null,
          })
          .eq("claim_run_id", id);
      }
    }

    if (summary !== undefined) updates.summary = summary;
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("agent_runs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  }
);

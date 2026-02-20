import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

// POST /api/agent/runs/:id/log - add a journal entry
export const POST = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: run_id } = await params;
    const body = await req.json();
    const { entry_type, content, related_task_id, agent_id, metadata } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const validTypes = [
      "action",
      "decision",
      "handoff",
      "error",
      "note",
      "claim",
      "release",
    ];
    const type = validTypes.includes(entry_type) ? entry_type : "action";

    // Verify run exists
    const { data: run } = await getSupabase()
      .from("agent_runs")
      .select("agent_id")
      .eq("id", run_id)
      .single();

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const { data, error } = await getSupabase()
      .from("run_log")
      .insert({
        run_id,
        agent_id: agent_id || run.agent_id,
        entry_type: type,
        content: content.trim(),
        related_task_id: related_task_id || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }
);

// GET /api/agent/runs/:id/log - get log entries for a run
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id: run_id } = await params;

    const { data, error } = await getSupabase()
      .from("run_log")
      .select("*")
      .eq("run_id", run_id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  }
);

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

const DEFAULT_LEASE_MINUTES = 10;

// POST /api/tasks/:id/claim - claim a task for an agent run
export const POST = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();
    const { run_id, agent_id, lease_duration_minutes } = body;

    if (!run_id || !agent_id) {
      return NextResponse.json(
        { error: "run_id and agent_id are required" },
        { status: 400 }
      );
    }

    const now = new Date();
    const leaseMinutes = lease_duration_minutes || DEFAULT_LEASE_MINUTES;
    const claimExpires = new Date(now.getTime() + leaseMinutes * 60 * 1000);

    // Check current task state
    const { data: task } = await getSupabase()
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status === "done") {
      return NextResponse.json(
        { error: "Task is already done" },
        { status: 409 }
      );
    }

    // Check if already claimed by someone with a valid lease
    if (
      task.assigned_agent &&
      task.claim_expires_at &&
      new Date(task.claim_expires_at) > now
    ) {
      return NextResponse.json(
        {
          error: "Task already claimed",
          claimed_by: task.assigned_agent,
          expires_at: task.claim_expires_at,
        },
        { status: 409 }
      );
    }

    // Claim it
    const { data: updated, error } = await getSupabase()
      .from("tasks")
      .update({
        assigned_agent: agent_id,
        claim_run_id: run_id,
        claim_expires_at: claimExpires.toISOString(),
        status: task.status === "todo" ? "in_progress" : task.status,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the claim
    await getSupabase().from("run_log").insert({
      run_id,
      agent_id,
      entry_type: "claim",
      content: `Claimed task: ${task.title}`,
      related_task_id: id,
    });

    return NextResponse.json(updated);
  }
);

// DELETE /api/tasks/:id/claim - release a task claim
export const DELETE = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();
    const { reason, run_id, agent_id } = body;

    const { data: task } = await getSupabase()
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      assigned_agent: null,
      claim_run_id: null,
      claim_expires_at: null,
    };

    // If releasing because completed, mark task done
    if (reason === "completed") {
      updates.status = "done";
      updates.completed_at = new Date().toISOString();
    }

    const { data: updated, error } = await getSupabase()
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the release
    if (run_id) {
      await getSupabase().from("run_log").insert({
        run_id,
        agent_id: agent_id || task.assigned_agent || "unknown",
        entry_type: "release",
        content: `Released task: ${task.title} (${reason || "manual"})`,
        related_task_id: id,
      });
    }

    return NextResponse.json(updated);
  }
);

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

// PATCH /api/tasks/:id - update task
export const PATCH = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();
    const { title, description, status, priority, metadata } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) {
      updates.status = status;
      if (status === "done") {
        updates.completed_at = new Date().toISOString();
      }
    }
    if (priority !== undefined) updates.priority = priority;
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  }
);

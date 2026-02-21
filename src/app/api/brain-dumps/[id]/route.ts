import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

// PATCH /api/brain-dumps/:id - update status
export const PATCH = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();
    const { status, metadata } = body;

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (metadata) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from("brain_dumps")
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

// DELETE /api/brain-dumps/:id - delete brain dump and its thread replies
export const DELETE = withAuth(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    // Delete any thread replies first
    await getSupabase()
      .from("brain_dumps")
      .delete()
      .eq("metadata->>thread_id", id);

    // Delete the brain dump itself
    const { error } = await getSupabase()
      .from("brain_dumps")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  }
);

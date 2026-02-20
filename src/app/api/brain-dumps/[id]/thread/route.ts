import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

// GET /api/brain-dumps/:id/thread - get the full conversation thread
export const GET = withAuth(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    // Get the root brain dump
    const { data: root, error: rootError } = await getSupabase()
      .from("brain_dumps")
      .select("*")
      .eq("id", id)
      .single();

    if (rootError || !root) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Resolve the actual thread root (in case id is a reply, follow thread_id up)
    const threadId = root.metadata?.thread_id || root.id;

    // Get all messages in this thread (root + replies)
    const { data: thread, error: threadError } = await getSupabase()
      .from("brain_dumps")
      .select("*")
      .or(`id.eq.${threadId},metadata->>thread_id.eq.${threadId}`)
      .order("created_at", { ascending: true });

    if (threadError) {
      return NextResponse.json(
        { error: threadError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: thread || [] });
  }
);

// POST /api/brain-dumps/:id/thread - reply to a brain dump
export const POST = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await req.json();
    const { content, author } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    if (!author || !["nate", "pebble"].includes(author)) {
      return NextResponse.json(
        { error: 'author must be "nate" or "pebble"' },
        { status: 400 }
      );
    }

    // Look up the target brain dump to resolve the thread root
    const { data: target, error: targetError } = await getSupabase()
      .from("brain_dumps")
      .select("id, metadata")
      .eq("id", id)
      .single();

    if (targetError || !target) {
      return NextResponse.json(
        { error: "Brain dump not found" },
        { status: 404 }
      );
    }

    // Thread ID is either the target's own thread_id (if it's a reply) or the target's id (if it's the root)
    const threadId = target.metadata?.thread_id || target.id;

    const { data, error } = await getSupabase()
      .from("brain_dumps")
      .insert({
        content: content.trim(),
        status: "new",
        metadata: {
          thread_id: threadId,
          author,
        },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }
);

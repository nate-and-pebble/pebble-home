import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

// POST /api/tasks - create task
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { title, description, priority, metadata } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  const validPriorities = ["low", "medium", "high", "urgent"];
  const taskPriority = validPriorities.includes(priority) ? priority : "medium";

  const { data, error } = await getSupabase()
    .from("tasks")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      status: "todo",
      priority: taskPriority,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
});

// GET /api/tasks - list with filters
export const GET = withAuth(async (req: NextRequest) => {
  const url = req.nextUrl;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const offset = (page - 1) * limit;

  let query = getSupabase()
    .from("tasks")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }
  if (priority) {
    query = query.eq("priority", priority);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  });
});

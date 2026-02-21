import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

// POST /api/goals - create goal
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { title, description, priority, tags, metadata } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const validPriorities = ["low", "medium", "high", "urgent"];
  const goalPriority = validPriorities.includes(priority) ? priority : "medium";

  const cleanTags = Array.isArray(tags)
    ? tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim())
    : [];

  const { data, error } = await getSupabase()
    .from("goals")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      status: "active",
      priority: goalPriority,
      tags: cleanTags,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
});

// GET /api/goals - list with pagination + filters + sorting
export const GET = withAuth(async (req: NextRequest) => {
  const url = req.nextUrl;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const sort = url.searchParams.get("sort") || "priority";
  const offset = (page - 1) * limit;

  let query = getSupabase()
    .from("goals")
    .select("*", { count: "exact" })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }
  if (priority) {
    query = query.eq("priority", priority);
  }

  if (sort === "priority") {
    // Sort by priority weight desc (urgent first), then created_at desc
    query = query.order("priority", {
      ascending: true,
      // Use a custom order: map priority text to sort position via array_position
    });
    // Supabase JS doesn't support array_position, so we sort client-side below
    query = query.order("created_at", { ascending: false });
  } else if (sort === "created") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "updated") {
    query = query.order("updated_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Client-side priority sort since Supabase can't do custom enum ordering
  let sorted = data || [];
  if (sort === "priority") {
    const priorityWeight: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    sorted = [...sorted].sort((a, b) => {
      const pa = priorityWeight[a.priority] ?? 99;
      const pb = priorityWeight[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  return NextResponse.json({
    data: sorted,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  });
});

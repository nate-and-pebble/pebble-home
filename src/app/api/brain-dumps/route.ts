import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

// POST /api/brain-dumps - create brain dump
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { content, metadata } = body;

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabase()
    .from("brain_dumps")
    .insert({
      content: content.trim(),
      status: "new",
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
});

// GET /api/brain-dumps - list with pagination + filters
export const GET = withAuth(async (req: NextRequest) => {
  const url = req.nextUrl;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const status = url.searchParams.get("status");
  const offset = (page - 1) * limit;

  let query = getSupabase()
    .from("brain_dumps")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
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

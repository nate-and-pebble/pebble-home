import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

interface ActivityItem {
  id: string;
  type: "brain_dump" | "task" | "bulletin";
  icon: string;
  text: string;
  time: string;
  status: string;
  created_at: string;
}

// GET /api/activity - combined feed (brain dumps + tasks + bulletins, newest first)
export const GET = withAuth(async (req: NextRequest) => {
  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

  const [brainDumps, tasks, bulletins] = await Promise.all([
    getSupabase()
      .from("brain_dumps")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    getSupabase()
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    getSupabase()
      .from("bulletins")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (brainDumps.error) {
    return NextResponse.json(
      { error: brainDumps.error.message },
      { status: 500 }
    );
  }
  if (tasks.error) {
    return NextResponse.json(
      { error: tasks.error.message },
      { status: 500 }
    );
  }
  if (bulletins.error) {
    return NextResponse.json(
      { error: bulletins.error.message },
      { status: 500 }
    );
  }

  const activity: ActivityItem[] = [];

  for (const bd of brainDumps.data || []) {
    const preview =
      bd.content.length > 60
        ? bd.content.slice(0, 60) + "..."
        : bd.content;
    activity.push({
      id: bd.id,
      type: "brain_dump",
      icon: "🧠",
      text: `Brain dump: ${preview}`,
      time: bd.created_at,
      status: bd.status,
      created_at: bd.created_at,
    });
  }

  for (const t of tasks.data || []) {
    const icon = t.status === "done" ? "✅" : t.status === "in_progress" ? "🔄" : "📋";
    activity.push({
      id: t.id,
      type: "task",
      icon,
      text: `Task: ${t.title}`,
      time: t.created_at,
      status: t.status,
      created_at: t.created_at,
    });
  }

  for (const b of bulletins.data || []) {
    activity.push({
      id: b.id,
      type: "bulletin",
      icon: b.status === "new" ? "📢" : "📋",
      text: `Bulletin: ${b.title}`,
      time: b.created_at,
      status: b.status,
      created_at: b.created_at,
    });
  }

  // Sort by created_at descending
  activity.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ data: activity.slice(0, limit) });
});

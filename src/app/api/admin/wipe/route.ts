import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/admin/wipe
 *
 * Deletes data in FK-safe order: run_log -> agent_runs -> tasks -> brain_dumps.
 * Bulletins are only wiped when { include_bulletins: true } is sent.
 *
 * Auth: X-API-Key must match PEBBLE_API_KEY (env MUST be set — returns 500 if missing).
 */
export async function POST(req: NextRequest) {
  // --- Auth: PEBBLE_API_KEY must exist and match ---
  const expected = process.env.PEBBLE_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "PEBBLE_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const provided = req.headers.get("x-api-key");
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse body ---
  let includeBulletins = false;
  try {
    const body = await req.json();
    includeBulletins = body?.include_bulletins === true;
  } catch {
    // no body or invalid JSON — that's fine, defaults apply
  }

  const db = getSupabase();
  const deleted: Record<string, number> = {};

  // Delete in FK-safe order
  const tables = ["run_log", "agent_runs", "tasks", "brain_dumps"];
  if (includeBulletins) tables.push("bulletins");

  for (const table of tables) {
    // Supabase delete requires a filter — use id != '' to match all rows
    const { data, error } = await db
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");

    if (error) {
      return NextResponse.json(
        { error: `Failed to wipe ${table}: ${error.message}`, deleted_so_far: deleted },
        { status: 500 }
      );
    }

    deleted[table] = data?.length ?? 0;
  }

  return NextResponse.json({ wiped: true, deleted });
}

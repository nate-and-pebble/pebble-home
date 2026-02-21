import { Nav } from "@/components/nav";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string;
};

async function getGoals(): Promise<Goal[]> {
  const { data, error } = await getSupabase()
    .from("goals")
    .select("id, title, description, status, priority, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch goals:", error.message);
    return [];
  }

  return data || [];
}

export default async function GoalsPage() {
  const goals = await getGoals();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Nav />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Goals</h2>
            <p className="mt-1 text-sm text-zinc-400">
              High-level goals Pebble can use when your inbox is empty.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800/50 bg-zinc-900/20">
          <div className="border-b border-zinc-800/50 px-5 py-4">
            <h3 className="text-sm font-medium text-zinc-200">Create Goal</h3>
            <p className="mt-1 text-xs text-zinc-500">
              (UI stub) For now, use the CLI: <code>pebble goal add &quot;...&quot;</code>
            </p>
          </div>
          <div className="px-5 py-4 text-sm text-zinc-300">
            This page is live and listing goals from <code>/api/goals</code>. Next:
            add a proper create/edit form.
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-medium text-zinc-200">Existing Goals</h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800/50">
            {goals.length === 0 ? (
              <div className="bg-zinc-900/20 px-5 py-6 text-sm text-zinc-400">
                No goals yet.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800/50">
                {goals.map((g) => (
                  <li key={g.id} className="bg-zinc-900/20 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-zinc-100">
                          {g.title}
                        </div>
                        {g.description ? (
                          <div className="mt-1 text-xs text-zinc-400">
                            {g.description}
                          </div>
                        ) : null}
                        <div className="mt-2 text-xs text-zinc-500">
                          priority: {g.priority} · status: {g.status}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {g.id?.slice(0, 8)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

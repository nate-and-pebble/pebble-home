import { GoalsManager } from "@/components/goals-manager";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">Goals</h2>
          <p className="mt-1 text-sm text-zinc-400">
            High-level goals Pebble can use when your inbox is empty.
          </p>
        </div>

        <GoalsManager />
      </main>
    </div>
  );
}

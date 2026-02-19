import { BrainDump } from "@/components/brain-dump";
import { StatusIndicator } from "@/components/status-indicator";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="rock">
            🪨
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              AI HQ
            </h1>
            <p className="text-xs text-zinc-500">Pebble &times; Nate</p>
          </div>
        </div>
        <StatusIndicator />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-3">
          {/* Brain Dump */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">Brain Dump</h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <BrainDump />
          </section>

          {/* Activity Feed */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">
                Activity Feed
              </h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <div className="space-y-3">
              {[
                {
                  icon: "🧠",
                  text: "Pebble processed a brain dump",
                  time: "Just now",
                },
                {
                  icon: "✅",
                  text: "Task completed: Set up dashboard",
                  time: "2m ago",
                },
                {
                  icon: "🔄",
                  text: "Syncing with Supabase...",
                  time: "5m ago",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 transition-colors duration-200 hover:bg-zinc-900/50"
                >
                  <span className="mt-0.5 text-sm">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300">{item.text}</p>
                    <p className="text-xs text-zinc-600">{item.time}</p>
                  </div>
                </div>
              ))}
              <p className="text-center text-xs text-zinc-700 pt-2">
                Live feed coming soon
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8 lg:col-span-2">
          {/* Task Queue */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">Task Queue</h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <div className="space-y-2">
              {[
                { task: "Review brain dumps", priority: "high" },
                { task: "Organize task backlog", priority: "medium" },
                { task: "Connect live activity feed", priority: "low" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 transition-colors duration-200 hover:bg-zinc-900/50"
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.priority === "high"
                        ? "bg-red-400"
                        : item.priority === "medium"
                          ? "bg-amber-400"
                          : "bg-zinc-500"
                    }`}
                  />
                  <span className="text-sm text-zinc-300">{item.task}</span>
                </div>
              ))}
              <p className="text-center text-xs text-zinc-700 pt-2">
                Supabase integration coming soon
              </p>
            </div>
          </section>

          {/* Quick Stats */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">Stats</h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Brain Dumps", value: "—" },
                { label: "Tasks Done", value: "—" },
                { label: "Uptime", value: "99.9%" },
                { label: "Sync", value: "Live" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3 text-center"
                >
                  <p className="text-lg font-semibold text-zinc-200">
                    {stat.value}
                  </p>
                  <p className="text-xs text-zinc-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-zinc-800/50 pt-6 text-center">
        <p className="text-xs text-zinc-700">
          AI HQ &middot; Built by Pebble 🪨 &amp; Nate
        </p>
      </footer>
    </div>
  );
}

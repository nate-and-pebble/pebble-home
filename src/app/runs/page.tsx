import { AgentRuns } from "@/components/agent-runs";

export default function RunsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-medium text-zinc-400">Agent Runs</h2>
          <div className="h-px flex-1 bg-zinc-800/50" />
        </div>
        <AgentRuns />
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AgentRuns } from "@/components/agent-runs";

const statuses = [
  { value: "", label: "All" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Done" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
];

export default function RunsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-medium text-zinc-400">Agent Runs</h2>
          <div className="h-px flex-1 bg-zinc-800/50" />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            {statuses.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  statusFilter === value
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Filter by agent..."
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="rounded-md border border-zinc-800/50 bg-zinc-900/50 px-2.5 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600 w-40"
          />
        </div>

        <AgentRuns statusFilter={statusFilter} agentFilter={agentFilter} />
      </section>
    </div>
  );
}

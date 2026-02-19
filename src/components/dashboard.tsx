"use client";

import { useState } from "react";
import { BrainDump } from "@/components/brain-dump";
import { ActivityFeed } from "@/components/activity-feed";
import { TaskQueue } from "@/components/task-queue";
import { StatsCards } from "@/components/stats-cards";
import { StatusIndicator } from "@/components/status-indicator";

export function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleDataChanged() {
    setRefreshKey((k) => k + 1);
  }

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
            <BrainDump onSaved={handleDataChanged} />
          </section>

          {/* Activity Feed */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">
                Activity Feed
              </h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <ActivityFeed refreshKey={refreshKey} />
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
            <TaskQueue refreshKey={refreshKey} />
          </section>

          {/* Quick Stats */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">Stats</h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <StatsCards refreshKey={refreshKey} />
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

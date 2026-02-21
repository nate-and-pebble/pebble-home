"use client";

import { useState } from "react";
import { BrainDump } from "@/components/brain-dump";
import { ActivityFeed } from "@/components/activity-feed";
import { TaskQueue } from "@/components/task-queue";
import { Bulletins } from "@/components/bulletins";
import { StatsCards } from "@/components/stats-cards";
import { PendingHandoffs } from "@/components/pending-handoffs";

export function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleDataChanged() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Main column */}
        <div className="min-w-0 space-y-8 lg:col-span-3">
          {/* Brain Dump */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">Brain Dump</h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <BrainDump onSaved={handleDataChanged} refreshKey={refreshKey} />
          </section>

          {/* Bulletins */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">
                Bulletins
              </h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <Bulletins refreshKey={refreshKey} onReply={handleDataChanged} />
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
        <div className="min-w-0 space-y-8 lg:col-span-2">
          {/* Task Queue */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">Task Queue</h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <TaskQueue refreshKey={refreshKey} onTaskCreated={handleDataChanged} />
          </section>

          {/* Pending Handoffs */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-medium text-zinc-400">
                Handoffs
              </h2>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <PendingHandoffs refreshKey={refreshKey} />
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
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface StatusData {
  activeRuns: number;
  lastRun: {
    agent_id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    summary: string | null;
  } | null;
  latestJournal: {
    content: string;
    entry_type: string;
    agent_id: string;
    created_at: string;
  } | null;
}

type AgentState = "working" | "recent" | "idle" | "offline";

function getAgentState(data: StatusData): AgentState {
  if (data.activeRuns > 0) return "working";

  if (!data.lastRun) return "offline";

  const lastTime = data.lastRun.completed_at || data.lastRun.started_at;
  const minutesAgo = (Date.now() - new Date(lastTime).getTime()) / 60_000;

  if (minutesAgo < 30) return "recent";
  if (minutesAgo < 120) return "idle";
  return "offline";
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getSubtitle(data: StatusData, state: AgentState): string {
  if (state === "working" && data.latestJournal) {
    const content = data.latestJournal.content;
    return content.length > 50 ? content.slice(0, 50) + "..." : content;
  }

  if (data.lastRun?.summary) {
    const summary = data.lastRun.summary;
    const preview =
      summary.length > 45 ? summary.slice(0, 45) + "..." : summary;
    const time = timeAgo(
      data.lastRun.completed_at || data.lastRun.started_at
    );
    return `${preview} · ${time}`;
  }

  if (data.lastRun) {
    return `Last seen ${timeAgo(data.lastRun.completed_at || data.lastRun.started_at)}`;
  }

  return "No activity yet";
}

const stateConfig: Record<
  AgentState,
  { label: string; dotClass: string; pingClass: string; textClass: string }
> = {
  working: {
    label: "Working",
    dotClass: "bg-emerald-500",
    pingClass: "bg-emerald-400 opacity-75 animate-ping",
    textClass: "text-emerald-400",
  },
  recent: {
    label: "Online",
    dotClass: "bg-emerald-500",
    pingClass: "",
    textClass: "text-emerald-400",
  },
  idle: {
    label: "Idle",
    dotClass: "bg-amber-500",
    pingClass: "",
    textClass: "text-amber-400",
  },
  offline: {
    label: "Offline",
    dotClass: "bg-zinc-600",
    pingClass: "",
    textClass: "text-zinc-500",
  },
};

const POLL_INTERVAL = 15_000;

export function StatusIndicator() {
  const [data, setData] = useState<StatusData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [prevSubtitle, setPrevSubtitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const json = await res.json();
      setData({
        activeRuns: json.counts.activeAgentRuns || 0,
        lastRun: json.lastRun,
        latestJournal: json.latestJournal,
      });
    } catch {
      // keep showing last known state
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
      fetchStatus();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchStatus]);

  useEffect(() => {
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  // Animate subtitle transitions
  useEffect(() => {
    if (!data) return;
    const state = getAgentState(data);
    const newSubtitle = getSubtitle(data, state);
    if (newSubtitle !== prevSubtitle) {
      const timer0 = setTimeout(() => {
        setTransitioning(true);
      }, 0);
      const timer = setTimeout(() => {
        setSubtitle(newSubtitle);
        setPrevSubtitle(newSubtitle);
        setTransitioning(false);
      }, 200);
      return () => {
        clearTimeout(timer0);
        clearTimeout(timer);
      };
    }
  }, [data, prevSubtitle]);

  if (!mounted || !data) return null;

  const state = getAgentState(data);
  const config = stateConfig[state];

  return (
    <div className="flex items-center gap-2.5 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 max-w-xs">
      <span className="relative flex h-2 w-2 shrink-0">
        {config.pingClass && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.pingClass}`}
          />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${config.dotClass}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <span className={`text-xs font-medium ${config.textClass}`}>
          Pebble {config.label}
        </span>
        {subtitle && (
          <p
            className={`text-[10px] text-zinc-500 truncate transition-opacity duration-200 ${
              transitioning ? "opacity-0" : "opacity-100"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

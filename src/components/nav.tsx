"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { StatusIndicator } from "@/components/status-indicator";

function SchemaBanner() {
  const [missing, setMissing] = useState<string[]>([]);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const json = await res.json();
      if (!json.schema_ok) setMissing(json.missing);
    } catch {
      // ignore — banner just won't show
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      check();
    }, 0);
    return () => clearTimeout(t);
  }, [check]);

  if (missing.length === 0) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <div className="mb-0 mt-4 rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3">
        <p className="text-sm text-amber-300">
          Database migrations pending
        </p>
        <p className="mt-1 text-xs text-amber-400/70">
          Missing: {missing.join(", ")}. Run the latest SQL migrations in your Supabase dashboard.
        </p>
      </div>
    </div>
  );
}

const links = [
  { href: "/", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/runs", label: "Agent Runs" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800/50">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-xl sm:text-2xl" role="img" aria-label="rock">
              🪨
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-100">
                AI HQ
              </h1>
              <p className="text-[10px] sm:text-xs text-zinc-500 hidden sm:block">
                Pebble &times; Nate
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {links.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm transition-colors ${
                    active
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <StatusIndicator />
      </div>

      <SchemaBanner />
    </nav>
  );
}

"use client";

import { useState, useRef } from "react";
import { getSupabase } from "@/lib/supabase";

export function BrainDump() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setStatus("sending");

    const { error } = await getSupabase()
      .from("brain_dumps")
      .insert({ content: content.trim(), status: "new" });

    if (error) {
      console.error("Failed to save brain dump:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("sent");
      setContent("");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Drop a thought, idea, or task for Pebble..."
        rows={4}
        className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/25"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) {
            handleSubmit(e);
          }
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-600">
          {status === "sent" && (
            <span className="text-emerald-400">Saved to Pebble&apos;s brain</span>
          )}
          {status === "error" && (
            <span className="text-red-400">Failed to save. Try again.</span>
          )}
          {status === "idle" && "Cmd+Enter to submit"}
        </span>
        <button
          type="submit"
          disabled={!content.trim() || status === "sending"}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
        >
          {status === "sending" ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Sending
            </span>
          ) : (
            "Send to Pebble"
          )}
        </button>
      </div>
    </form>
  );
}

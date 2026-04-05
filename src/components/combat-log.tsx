"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { LogEntry } from "@/lib/types";

interface CombatLogProps {
  logs: LogEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  hit: "text-amber",
  miss: "text-text-dim",
  block: "text-cyan",
  dodge: "text-cyan",
  parry: "text-magenta",
  stun: "text-magenta",
  attack: "text-amber",
  move: "text-text-dim",
  ko: "text-magenta",
  system: "text-amber",
};

const FIGHTER_PREFIX: Record<string, string> = {
  red: "text-purple",
  blue: "text-neon-green",
};

export function CombatLog({ logs }: CombatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const filtered = logs.filter((l) => l.type !== "move");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length]);

  const copyLog = useCallback(() => {
    const text = filtered
      .map((l) => `${String(l.tick).padStart(3, "0")} ${l.fighter === "red" ? "[P]" : "[B]"} ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [filtered]);

  return (
    <div className="h-full flex flex-col bg-bg-panel overflow-hidden">
      <div className="px-2 py-1 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-[9px] font-mono text-cyan/60 uppercase tracking-widest">&gt; Intrusion Log</span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-text-dim tabular-nums">{filtered.length}</span>
          {filtered.length > 0 && (
            <button
              onClick={copyLog}
              className="text-[9px] font-mono text-text-dim hover:text-cyan transition-colors"
              title="Copy log"
            >
              {copied ? "COPIED" : "COPY"}
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-1.5 font-mono text-[10px] leading-[14px]">
        {filtered.length === 0 && (
          <p className="text-text-dim text-center py-4 text-[10px]">// awaiting connection...</p>
        )}
        {filtered.map((log, i) => (
          <div key={i} className="flex gap-1.5 py-px">
            <span className="text-text-dim w-6 shrink-0 text-right tabular-nums">
              {String(log.tick).padStart(3, "0")}
            </span>
            <span className={`w-6 shrink-0 font-bold ${FIGHTER_PREFIX[log.fighter] || ""}`}>
              {log.fighter === "red" ? "[P]" : "[B]"}
            </span>
            <span className={TYPE_COLORS[log.type] || "text-text-primary"}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

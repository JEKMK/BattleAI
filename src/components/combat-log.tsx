"use client";

import { useRef, useEffect } from "react";
import type { LogEntry } from "@/lib/types";

interface CombatLogProps {
  logs: LogEntry[];
}

const TYPE_COLORS: Record<string, string> = {
  hit: "text-amber",
  miss: "text-text-dim",
  block: "text-cyan",
  dodge: "text-cyan",
  attack: "text-magenta",
  move: "text-text-secondary",
  ko: "text-magenta",
  system: "text-amber",
};

const FIGHTER_PREFIX: Record<string, string> = {
  red: "text-purple",
  blue: "text-neon-green",
};

export function CombatLog({ logs }: CombatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div
      ref={scrollRef}
      className="h-48 overflow-y-auto bg-bg-deep border border-border rounded-sm p-2 font-mono text-xs leading-5"
    >
      {logs.length === 0 && (
        <p className="text-text-dim">Waiting for battle...</p>
      )}
      {logs.map((log, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-text-dim w-8 shrink-0 text-right tabular-nums">
            {String(log.tick).padStart(3, "0")}
          </span>
          <span className={`w-10 shrink-0 font-bold ${FIGHTER_PREFIX[log.fighter] || ""}`}>
            {log.fighter === "red" ? "[P]" : "[B]"}
          </span>
          <span className={TYPE_COLORS[log.type] || "text-text-primary"}>
            {log.message}
          </span>
        </div>
      ))}
    </div>
  );
}

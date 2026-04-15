"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { LogEntry } from "@/lib/types";
import { IMPLANTS, STIMS } from "@/lib/implants";

interface TickDecision {
  move: string;
  action: string;
}

interface CombatLogProps {
  logs: LogEntry[];
  simplified?: boolean;
  redImplants?: string[];
  redStims?: string[];
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
  heal: "text-neon-green",
  system: "text-amber",
};

const FIGHTER_PREFIX: Record<string, string> = {
  red: "text-purple",
  blue: "text-neon-green",
};

function simplifyMessage(msg: string, type: string): string {
  const dmgMatch = msg.match(/-(\d+)/);
  const hpMatch = msg.match(/\[(\d+)\/(\d+)\]/);
  const dmg = dmgMatch ? dmgMatch[1] : null;
  const hp = hpMatch ? `[${hpMatch[1]}/${hpMatch[2]}]` : "";

  if (type === "hit") {
    if (msg.includes("Hammer") || msg.includes("MEGA")) return `HAMMER -${dmg} ${hp}`;
    if (msg.includes("Spike") || msg.includes("COMBO Spike")) return `SPIKE -${dmg} ${hp}`;
    if (msg.includes("Burn") || msg.includes("COMBO Burn")) return `BURN -${dmg} ${hp}`;
    if (msg.includes("Firewall")) return `WALL -${dmg} ${hp}`;
    return dmg ? `-${dmg} ${hp}` : msg;
  }
  if (type === "miss") return "MISS";
  if (type === "block") return "SHIELD UP";
  if (type === "dodge") return "GHOST";
  if (type === "parry") return msg.includes("triggers") || msg.includes("reflects") || msg.includes("counter") ? "BLACK ICE HIT!" : "BLACK ICE";
  if (type === "stun") return "STUNNED";
  if (type === "ko") return "FLATLINED";
  if (type === "system") return msg;
  return msg;
}

/** Get implant icon if this log line was boosted by an equipped implant/stim */
function getImplantMarker(msg: string, type: string, fighter: string, implants: string[], stims: string[]): string {
  if (fighter !== "red") return ""; // only mark player's actions
  const icons: string[] = [];

  if (type === "hit" || type === "attack") {
    if (msg.includes("Burn") && implants.includes("gorilla_arms")) icons.push(IMPLANTS.gorilla_arms.icon);
    if (msg.includes("Spike") && implants.includes("kiroshi_optics")) icons.push(IMPLANTS.kiroshi_optics.icon);
    if (stims.includes("black_lace")) icons.push(STIMS.black_lace.icon);
  }
  if (type === "heal") {
    if (stims.includes("bounce_back")) icons.push(STIMS.bounce_back.icon);
  }

  return icons.join("");
}

export function CombatLog({ logs, simplified = false, redImplants = [], redStims = [], decisions = {}, contextWindow = 0 }: CombatLogProps & { decisions?: Record<number, { red?: TickDecision; blue?: TickDecision }>; contextWindow?: number }) {
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
        {filtered.map((log, i) => {
          // Show AI decision before first log of each tick (for player)
          const prevTick = i > 0 ? filtered[i - 1].tick : -1;
          const isNewTick = log.tick !== prevTick;
          const tickDecision = isNewTick ? decisions[log.tick] : null;

          return (
          <div key={i}>
            {tickDecision?.red && (
              <div className="flex gap-1.5 py-px opacity-60">
                <span className="text-text-dim w-6 shrink-0 text-right tabular-nums">
                  {String(log.tick).padStart(3, "0")}
                </span>
                <span className="w-6 shrink-0 font-bold text-purple">[P]</span>
                <span className="text-purple">
                  → {tickDecision.red.move.toUpperCase()} + {tickDecision.red.action.toUpperCase()}
                  {contextWindow > 0 && <span className="text-text-dim ml-1">🧠{Math.min(log.tick, contextWindow)}</span>}
                </span>
              </div>
            )}
          <div className="flex gap-1.5 py-px">
            <span className="text-text-dim w-6 shrink-0 text-right tabular-nums">
              {String(log.tick).padStart(3, "0")}
            </span>
            <span className={`w-6 shrink-0 font-bold ${FIGHTER_PREFIX[log.fighter] || ""}`}>
              {log.fighter === "red" ? "[P]" : "[B]"}
            </span>
            <span className={TYPE_COLORS[log.type] || "text-text-primary"}>
              {simplified ? simplifyMessage(log.message, log.type) : log.message}
              {(() => {
                const marker = getImplantMarker(log.message, log.type, log.fighter, redImplants, redStims);
                return marker ? <span className="ml-1">{marker}</span> : null;
              })()}
            </span>
          </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

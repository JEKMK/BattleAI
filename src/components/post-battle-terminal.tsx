"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameState } from "@/lib/types";

interface PostBattleTerminalProps {
  gameState: GameState;
  analytics?: {
    red: { actions: Record<string, number>; totalDmgDealt: number; totalDmgBlocked: number; shotAccuracy: number; shotsHit: number; shotsFired: number };
    blue: { actions: Record<string, number>; totalDmgDealt: number };
  };
  onNameSubmit: (name: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
  punch: "BURN", shoot: "SPIKE", heavy: "HAMMER",
  block: "SHIELD", dodge: "GHOST", parry: "BLACK ICE", none: "IDLE",
};

export function PostBattleTerminal({ gameState, analytics, onNameSubmit }: PostBattleTerminalProps) {
  const [phase, setPhase] = useState<"stats" | "motivate" | "name">("stats");
  const [visibleLines, setVisibleLines] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const won = gameState.winner === "red";
  const draw = gameState.winner === "draw";
  const player = gameState.fighters[0];
  const bot = gameState.fighters[1];

  // Build action breakdown
  const redActions = analytics?.red.actions || {};
  const totalActions = Math.max(1, Object.values(redActions).reduce((a, b) => a + b, 0));
  const topActions = Object.entries(redActions)
    .filter(([k]) => k !== "none")
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k, v]) => `${ACTION_LABELS[k] || k} ${Math.round((v / totalActions) * 100)}%`)
    .join(", ");

  const dmgDealt = analytics?.red.totalDmgDealt || 0;
  const dmgTaken = analytics?.blue.totalDmgDealt || 0;

  // Stats lines
  const statsLines = [
    `Battle analysis complete.`,
    `> Subroutines: ${topActions || "NONE"}`,
    `> Damage dealt: ${dmgDealt}  |  Damage taken: ${dmgTaken}`,
    `> Result: ${won ? "ICE CRACKED ✓" : draw ? "MUTUAL DESTRUCTION" : "FLATLINED ✗"}`,
  ];

  // Motivate lines
  const motivateLines = won ? [
    "Not bad. But that was level 1. Don't get cocky.",
    "Win battles → steal enemy prompts. Study them. Adapt. Get stronger.",
    "New abilities unlock as you level up. Rewrite your orders. Outsmart the ICE.",
    "And soon... other runners enter the matrix.",
  ] : [
    "Flatlined. Your prompt was predictable. The ICE read you like a book.",
    "Rewrite your orders. Try different tactics. Block more. Move smarter.",
    "Steal enemy prompts when you win — their code becomes your weapon.",
    "Get back in there. The matrix doesn't respect quitters.",
  ];

  // Typewriter effect — reveal lines one by one
  useEffect(() => {
    const lines = phase === "stats" ? statsLines : motivateLines;
    if (visibleLines >= lines.length) {
      if (phase === "stats") {
        setTimeout(() => { setPhase("motivate"); setVisibleLines(0); }, 800);
      } else if (phase === "motivate") {
        setTimeout(() => { setPhase("name"); }, 800);
      }
      return;
    }
    const timer = setTimeout(() => setVisibleLines((v) => v + 1), 400);
    return () => clearTimeout(timer);
  }, [visibleLines, phase]);

  // Focus name input
  useEffect(() => {
    if (phase === "name") setTimeout(() => inputRef.current?.focus(), 300);
  }, [phase]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleLines, phase]);

  const handleSubmit = useCallback((value: string) => {
    const name = value.trim().toUpperCase() || "ANONYMOUS";
    onNameSubmit(name);
  }, [onNameSubmit]);

  const currentLines = phase === "stats" ? statsLines : phase === "motivate" ? motivateLines : [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", damping: 25 }}
          className="relative w-full max-w-md"
        >
          <div className="bg-bg-deep border border-neon-green/30 rounded-sm overflow-hidden crt-terminal"
            style={{ boxShadow: "0 0 40px rgba(57,255,20,0.1), inset 0 0 60px rgba(0,0,0,0.5)" }}>

            {/* Scanlines */}
            <div className="absolute inset-0 pointer-events-none z-10" style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,20,0.015) 2px, rgba(57,255,20,0.015) 4px)",
            }} />

            {/* Header */}
            <div className="border-b border-neon-green/10 px-4 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono ${won ? "text-neon-green" : "text-magenta"}`}>●</span>
                <span className="text-neon-green/40 text-[9px] font-mono tracking-widest">SYSOP DEBRIEF</span>
              </div>
              <span className="text-text-dim text-[8px] font-mono">
                {gameState.tick} CYCLES | {player.hp}/{player.maxHp} ICE
              </span>
            </div>

            {/* Body */}
            <div ref={scrollRef} className="p-4 font-mono text-sm leading-relaxed max-h-[400px] overflow-y-auto">
              {/* Stats phase */}
              {(phase === "stats" || phase === "motivate" || phase === "name") && (
                <div className="mb-3">
                  {statsLines.slice(0, phase === "stats" ? visibleLines : statsLines.length).map((line, i) => (
                    <motion.div key={`s-${i}`} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                      className={`mb-1 ${i === 0 ? "text-neon-green/40 text-[10px] uppercase tracking-widest" : "text-cyan text-[11px]"}`}>
                      {i === 0 && <span className="text-neon-green/40">SYSOP&gt; </span>}
                      {line}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Motivate phase */}
              {(phase === "motivate" || phase === "name") && (
                <div className="mb-3 border-t border-neon-green/10 pt-3">
                  {motivateLines.slice(0, phase === "motivate" ? visibleLines : motivateLines.length).map((line, i) => (
                    <motion.div key={`m-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`mb-2 text-[11px] ${i === motivateLines.length - 1 ? "text-amber" : "text-neon-green/70"}`}>
                      <span className="text-neon-green/40">SYSOP&gt; </span>
                      {line}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Name input */}
              {phase === "name" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-t border-neon-green/10 pt-3">
                  <div className="text-amber text-[11px] mb-2">
                    <span className="text-neon-green/40">SYSOP&gt; </span>
                    What do they call you, runner?
                  </div>
                  <div className="flex items-center gap-1 cursor-text" onClick={() => inputRef.current?.focus()}>
                    <span className="text-neon-green">&gt;</span>
                    <input ref={inputRef} type="text" maxLength={20} autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmit((e.target as HTMLInputElement).value);
                      }}
                      className="bg-transparent border-none outline-none text-neon-green font-mono text-sm uppercase caret-transparent flex-1"
                      spellCheck={false} autoComplete="off" />
                    <span className="inline-block w-2 h-4 bg-neon-green/80 animate-pulse" />
                  </div>
                  <a href="/lore" className="text-[8px] font-mono text-amber/30 hover:text-amber transition-colors mt-3 inline-block">
                    [FULL TRANSMISSION — READ THE LORE]
                  </a>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

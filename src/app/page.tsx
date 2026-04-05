"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Arena } from "@/components/arena";
import { CombatLog } from "@/components/combat-log";
import type { Faction, GameState } from "@/lib/types";

interface FighterAnalytics {
  moves: Record<string, number>;
  actions: Record<string, number>;
  avgLatency: number;
  totalLatency: number;
  count: number;
}

interface UsageData {
  _type: "usage";
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  costUSD: number;
  perModel: { model: string; calls: number; inputTokens: number; outputTokens: number; costUSD: number }[];
  analytics?: {
    red: FighterAnalytics;
    blue: FighterAnalytics;
  };
}

interface TickDebug {
  redAction: { move: string; action: string };
  blueAction: { move: string; action: string };
  redRaw?: string;
  blueRaw?: string;
  redLatency?: number;
  blueLatency?: number;
}
import { FACTION_META, BOT_PROMPTS } from "@/lib/types";

const FACTIONS: Faction[] = ["anthropic", "google", "openai"];

const BOTS = Object.entries(BOT_PROMPTS).map(([key, val]) => ({
  key,
  ...val,
}));

export default function Home() {
  const [prompt, setPrompt] = useState(
    "You are a smart tactical fighter. Keep medium distance. Shoot when far, punch when close. Dodge heavy attacks. Block when enemy is adjacent and not charging. Be unpredictable.",
  );
  const [faction, setFaction] = useState<Faction>("anthropic");
  const [botType, setBotType] = useState("balanced");
  const [botFaction, setBotFaction] = useState<Faction>("openai");
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [lastDebug, setLastDebug] = useState<TickDebug | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isFighting, setIsFighting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startBattle = useCallback(async () => {
    if (isFighting) {
      abortRef.current?.abort();
      setIsFighting(false);
      return;
    }

    setIsFighting(true);
    setGameState(null);
    setUsage(null);
    setLastDebug(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerPrompt: prompt,
          playerFaction: faction,
          botType,
          botFaction,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Battle failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed._type === "usage") {
                setUsage(parsed as UsageData);
              } else {
                if (parsed._debug) {
                  setLastDebug(parsed._debug as TickDebug);
                }
                setGameState(parsed as GameState);
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Battle error:", e);
      }
    } finally {
      setIsFighting(false);
    }
  }, [prompt, faction, botType, botFaction, isFighting]);

  const isOver = gameState?.status === "ko" || gameState?.status === "timeout";

  return (
    <div className="h-screen bg-bg-deep flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-bg-panel px-4 py-1 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-base font-bold tracking-[0.25em] glow-cyan text-cyan animate-flicker">
            BATTLE<span className="text-magenta">AI</span>
          </h1>
          <div className="h-3 w-px bg-border" />
          <span className="text-text-dim text-[9px] font-mono tracking-wider">NEURAL COMBAT ARENA</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px]">
          {gameState && (
            <>
              <span className="text-text-dim">CYCLE</span>
              <span className="text-cyan tabular-nums">{String(gameState.tick).padStart(3, "0")}</span>
              <span className="text-text-dim">/120</span>
              {gameState.tick >= 30 && (
                <span className="text-magenta animate-pulse-glow text-[9px]">FIREWALL ACTIVE</span>
              )}
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex gap-0 overflow-hidden">
        {/* Left Panel — Config */}
        <div className="w-72 shrink-0 flex flex-col border-r border-border bg-bg-panel overflow-y-auto">
          {/* Prompt — hero element */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-cyan text-[10px] font-mono uppercase tracking-widest glow-cyan">
                &gt; Construct Code_
              </label>
              <span className="text-text-dim text-[9px] font-mono tabular-nums">~{Math.ceil(prompt.length / 4)} RAM</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-36 bg-bg-deep border border-border-bright rounded-sm p-2 text-xs font-mono text-cyan/90 resize-none focus:outline-none focus:border-cyan focus:shadow-[0_0_10px_#00f0ff22] transition-all leading-relaxed"
              placeholder="// Define your construct's neural template..."
              disabled={isFighting}
              spellCheck={false}
            />
          </div>

          {/* Factions */}
          <div className="p-3 border-b border-border">
            <label className="text-text-secondary text-[9px] font-mono uppercase tracking-widest block mb-1.5">Zaibatsu</label>
            <div className="grid grid-cols-3 gap-1.5">
              {FACTIONS.map((f) => {
                const meta = FACTION_META[f];
                const selected = faction === f;
                return (
                  <button key={f} onClick={() => setFaction(f)} disabled={isFighting}
                    className={`py-1.5 rounded-sm border text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${selected ? "border-current bg-bg-elevated" : "border-border hover:border-border-bright bg-bg-deep"}`}
                    style={{ color: selected ? meta.color : "var(--text-dim)", boxShadow: selected ? meta.glow : "none" }}>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target */}
          <div className="p-3 border-b border-border">
            <label className="text-text-secondary text-[9px] font-mono uppercase tracking-widest block mb-1.5">Target ICE</label>
            <div className="flex gap-1.5">
              {BOTS.map((bot) => {
                const selected = botType === bot.key;
                return (
                  <button key={bot.key} onClick={() => setBotType(bot.key)} disabled={isFighting}
                    className={`flex-1 py-1.5 rounded-sm border text-center transition-all ${selected ? "border-magenta bg-bg-elevated" : "border-border hover:border-border-bright bg-bg-deep"}`}>
                    <span className={`text-[9px] font-mono font-bold ${selected ? "text-magenta" : "text-text-secondary"}`}>{bot.name}</span>
                  </button>
                );
              })}
            </div>
            <label className="text-text-secondary text-[9px] font-mono uppercase tracking-widest block mt-2 mb-1.5">Target Zaibatsu</label>
            <div className="grid grid-cols-3 gap-1.5">
              {FACTIONS.map((f) => {
                const meta = FACTION_META[f];
                const selected = botFaction === f;
                return (
                  <button key={f} onClick={() => setBotFaction(f)} disabled={isFighting}
                    className={`py-1.5 rounded-sm border text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${selected ? "border-current bg-bg-elevated" : "border-border hover:border-border-bright bg-bg-deep"}`}
                    style={{ color: selected ? meta.color : "var(--text-dim)", boxShadow: selected ? meta.glow : "none" }}>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FIGHT */}
          <div className="p-3">
            <motion.button onClick={startBattle} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
              className={`w-full py-3 rounded-sm font-mono font-bold text-sm uppercase tracking-[0.4em] transition-all ${isFighting ? "bg-magenta/20 border-2 border-magenta text-magenta" : "bg-cyan/10 border-2 border-cyan text-cyan hover:bg-cyan/20"}`}
              style={{ boxShadow: isFighting ? "var(--glow-magenta)" : "var(--glow-cyan)" }}>
              {isFighting ? "ABORT" : "JACK IN"}
            </motion.button>
          </div>

          {/* Cost */}
          {usage && (
            <div className="px-3 pb-2 font-mono text-[9px] text-text-dim">
              <span className="text-amber">${usage.costUSD.toFixed(4)}</span> | {usage.totalCalls} calls | {usage.totalTokens.toLocaleString()} tok
            </div>
          )}
        </div>

        {/* Center — Arena */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 min-w-0 p-3">
          {/* Fighter HP bars */}
          {gameState && (
            <div className="w-full max-w-lg flex items-center gap-3 font-mono text-[11px]">
              <div className="flex-1">
                <div className="flex justify-between mb-0.5">
                  <span className="font-bold" style={{ color: FACTION_META[gameState.fighters[0].faction].color }}>[P] {gameState.fighters[0].name}</span>
                  <span className="text-text-secondary tabular-nums">{gameState.fighters[0].hp}/{gameState.fighters[0].maxHp} ICE</span>
                </div>
                <div className="h-2 bg-bg-deep border border-border rounded-sm overflow-hidden">
                  <motion.div className="h-full" style={{ backgroundColor: gameState.fighters[0].hp > 5 ? "#39ff14" : gameState.fighters[0].hp > 2 ? "#ffb800" : "#ff2d6a" }}
                    initial={false} animate={{ width: `${(gameState.fighters[0].hp / gameState.fighters[0].maxHp) * 100}%` }} transition={{ duration: 0.3 }} />
                </div>
              </div>
              <span className="text-text-dim text-sm font-bold">VS</span>
              <div className="flex-1">
                <div className="flex justify-between mb-0.5">
                  <span className="text-text-secondary tabular-nums">{gameState.fighters[1].hp}/{gameState.fighters[1].maxHp} ICE</span>
                  <span className="font-bold" style={{ color: FACTION_META[gameState.fighters[1].faction].color }}>{gameState.fighters[1].name} [B]</span>
                </div>
                <div className="h-2 bg-bg-deep border border-border rounded-sm overflow-hidden">
                  <motion.div className="h-full ml-auto" style={{ backgroundColor: gameState.fighters[1].hp > 5 ? "#39ff14" : gameState.fighters[1].hp > 2 ? "#ffb800" : "#ff2d6a" }}
                    initial={false} animate={{ width: `${(gameState.fighters[1].hp / gameState.fighters[1].maxHp) * 100}%` }} transition={{ duration: 0.3 }} />
                </div>
              </div>
            </div>
          )}

          {/* Arena */}
          <div className="relative">
            <Arena state={gameState} />
            <AnimatePresence>
              {isOver && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }} className="text-center">
                    <div className={`font-mono text-3xl font-bold tracking-widest mb-1 ${gameState?.winner === "red" ? "text-cyan glow-cyan" : gameState?.winner === "blue" ? "text-magenta glow-magenta" : "text-amber glow-amber"}`}>
                      {gameState?.winner === "red" ? "ICE CRACKED" : gameState?.winner === "blue" ? "FLATLINED" : "DRAW"}
                    </div>
                    <p className="text-text-secondary text-xs font-mono">{gameState?.status === "timeout" ? "TIME OUT" : "SYSTEM DOWN"}</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live Debug */}
          {lastDebug && isFighting && (
            <div className="w-full max-w-lg flex gap-2 font-mono text-[10px]">
              <div className="flex-1 bg-bg-surface border border-border rounded-sm px-2 py-1">
                <span className="text-purple font-bold">[P]</span> <span className="text-text-secondary">{lastDebug.redAction.move}</span> <span className="text-amber">{lastDebug.redAction.action}</span> <span className="text-text-dim">{lastDebug.redLatency}ms</span>
              </div>
              <div className="flex-1 bg-bg-surface border border-border rounded-sm px-2 py-1">
                <span className="text-neon-green font-bold">[B]</span> <span className="text-text-secondary">{lastDebug.blueAction.move}</span> <span className="text-amber">{lastDebug.blueAction.action}</span> <span className="text-text-dim">{lastDebug.blueLatency}ms</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Log + Analytics */}
        <div className="w-80 shrink-0 flex flex-col border-l border-border bg-bg-panel overflow-hidden">
          {/* Combat Log */}
          <div className="flex-1 min-h-0">
            <CombatLog logs={gameState?.log ?? []} />
          </div>

          {/* Post-Battle Analytics */}
          {usage?.analytics && (
            <div className="border-t border-border p-2 font-mono text-[9px] shrink-0 max-h-40 overflow-y-auto">
              <h3 className="text-text-secondary uppercase tracking-widest text-[9px] mb-1.5">Analytics</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["red", "blue"] as const).map((side) => {
                  const data = usage.analytics![side];
                  if (!data) return null;
                  const isPlayer = side === "red";
                  const totalActions = Object.values(data.actions).reduce((a, b) => a + b, 0);
                  return (
                    <div key={side}>
                      <div className={`font-bold mb-1 ${isPlayer ? "text-purple" : "text-neon-green"}`}>
                        {isPlayer ? "[P]" : "[B]"} {data.avgLatency}ms
                      </div>
                      {Object.entries(data.actions).sort(([, a], [, b]) => b - a).map(([action, count]) => {
                        const pct = totalActions > 0 ? (count / totalActions) * 100 : 0;
                        return (
                          <div key={action} className="flex items-center gap-0.5">
                            <span className="w-10 text-[8px] text-text-secondary">{action}</span>
                            <div className="flex-1 h-1.5 bg-bg-deep rounded-sm overflow-hidden">
                              <div className="h-full rounded-sm" style={{
                                width: `${pct}%`,
                                backgroundColor: action === "punch" || action === "heavy" ? "#ffb800" : action === "shoot" ? "#39ff14" : action === "block" || action === "dodge" ? "#00f0ff" : action === "parry" ? "#ff2d6a" : "#4a4a5e",
                              }} />
                            </div>
                            <span className="w-7 text-right text-[8px] text-text-dim tabular-nums">{Math.round(pct)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

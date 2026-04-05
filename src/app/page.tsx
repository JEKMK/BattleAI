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
    <div className="min-h-screen bg-bg-deep flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-lg font-bold tracking-widest glow-cyan text-cyan animate-flicker">
            BATTLE<span className="text-magenta">AI</span>
          </h1>
          <span className="text-text-dim text-xs font-mono">v0.1 PROTOTYPE</span>
        </div>
        {gameState && (
          <div className="font-mono text-xs text-text-secondary">
            TICK {String(gameState.tick).padStart(3, "0")}/120
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Panel — Config */}
        <div className="lg:w-80 shrink-0 flex flex-col gap-4">
          {/* Prompt */}
          <div className="bg-bg-panel border border-border rounded-sm p-3">
            <label className="text-text-secondary text-xs font-mono uppercase tracking-wider block mb-2">
              System Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 bg-bg-deep border border-border rounded-sm p-2 text-xs font-mono text-text-primary resize-none focus:outline-none focus:border-cyan transition-colors"
              placeholder="Define your fighter's strategy..."
              disabled={isFighting}
            />
            <div className="flex justify-between mt-1">
              <span className="text-text-dim text-[10px] font-mono">
                {prompt.length} chars
              </span>
              <span className="text-text-dim text-[10px] font-mono">
                ~{Math.ceil(prompt.length / 4)} tokens
              </span>
            </div>
          </div>

          {/* Player Faction */}
          <div className="bg-bg-panel border border-border rounded-sm p-3">
            <label className="text-text-secondary text-xs font-mono uppercase tracking-wider block mb-2">
              Your Faction
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FACTIONS.map((f) => {
                const meta = FACTION_META[f];
                const selected = faction === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFaction(f)}
                    disabled={isFighting}
                    className={`
                      p-2 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-all
                      ${selected
                        ? "border-current bg-bg-elevated"
                        : "border-border hover:border-border-bright bg-bg-deep"
                      }
                    `}
                    style={{
                      color: selected ? meta.color : "var(--text-dim)",
                      boxShadow: selected ? meta.glow : "none",
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opponent */}
          <div className="bg-bg-panel border border-border rounded-sm p-3">
            <label className="text-text-secondary text-xs font-mono uppercase tracking-wider block mb-2">
              Opponent
            </label>
            <div className="flex flex-col gap-2">
              {BOTS.map((bot) => {
                const selected = botType === bot.key;
                return (
                  <button
                    key={bot.key}
                    onClick={() => setBotType(bot.key)}
                    disabled={isFighting}
                    className={`
                      p-2 rounded-sm border text-left transition-all
                      ${selected
                        ? "border-magenta bg-bg-elevated"
                        : "border-border hover:border-border-bright bg-bg-deep"
                      }
                    `}
                  >
                    <span className={`text-xs font-mono font-bold ${selected ? "text-magenta" : "text-text-secondary"}`}>
                      {bot.name}
                    </span>
                    <p className="text-[10px] font-mono text-text-dim mt-0.5 line-clamp-1">
                      {bot.prompt.slice(0, 60)}...
                    </p>
                  </button>
                );
              })}
            </div>

            <label className="text-text-secondary text-xs font-mono uppercase tracking-wider block mt-3 mb-2">
              Bot Faction
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FACTIONS.map((f) => {
                const meta = FACTION_META[f];
                const selected = botFaction === f;
                return (
                  <button
                    key={f}
                    onClick={() => setBotFaction(f)}
                    disabled={isFighting}
                    className={`
                      p-2 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-all
                      ${selected
                        ? "border-current bg-bg-elevated"
                        : "border-border hover:border-border-bright bg-bg-deep"
                      }
                    `}
                    style={{
                      color: selected ? meta.color : "var(--text-dim)",
                      boxShadow: selected ? meta.glow : "none",
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FIGHT button */}
          <motion.button
            onClick={startBattle}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              w-full py-3 rounded-sm font-mono font-bold text-sm uppercase tracking-[0.3em] transition-all
              ${isFighting
                ? "bg-magenta/20 border border-magenta text-magenta"
                : "bg-cyan/10 border border-cyan text-cyan hover:bg-cyan/20"
              }
            `}
            style={{
              boxShadow: isFighting ? "var(--glow-magenta)" : "var(--glow-cyan)",
            }}
          >
            {isFighting ? "ABORT" : "FIGHT"}
          </motion.button>
        </div>

        {/* Center — Arena */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* Fighter status bars */}
          {gameState && (
            <div className="w-full flex items-center gap-4 font-mono text-xs">
              {/* Red (Player) */}
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span style={{ color: FACTION_META[gameState.fighters[0].faction].color }}>
                    [P] {gameState.fighters[0].name}
                  </span>
                  <span className="text-text-secondary">
                    {gameState.fighters[0].hp}/{gameState.fighters[0].maxHp} HP
                  </span>
                </div>
                <div className="h-2 bg-bg-deep border border-border rounded-sm overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{
                      backgroundColor:
                        gameState.fighters[0].hp > 5
                          ? "#39ff14"
                          : gameState.fighters[0].hp > 2
                            ? "#ffb800"
                            : "#ff2d6a",
                    }}
                    initial={false}
                    animate={{ width: `${(gameState.fighters[0].hp / gameState.fighters[0].maxHp) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              <span className="text-text-dim text-lg">VS</span>

              {/* Blue (Bot) */}
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-text-secondary">
                    {gameState.fighters[1].hp}/{gameState.fighters[1].maxHp} HP
                  </span>
                  <span style={{ color: FACTION_META[gameState.fighters[1].faction].color }}>
                    {gameState.fighters[1].name} [B]
                  </span>
                </div>
                <div className="h-2 bg-bg-deep border border-border rounded-sm overflow-hidden">
                  <motion.div
                    className="h-full ml-auto"
                    style={{
                      backgroundColor:
                        gameState.fighters[1].hp > 5
                          ? "#39ff14"
                          : gameState.fighters[1].hp > 2
                            ? "#ffb800"
                            : "#ff2d6a",
                    }}
                    initial={false}
                    animate={{ width: `${(gameState.fighters[1].hp / gameState.fighters[1].maxHp) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Arena Canvas */}
          <div className="relative">
            <Arena state={gameState} />

            {/* Victory overlay */}
            <AnimatePresence>
              {isOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-bg-deep/80 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="text-center"
                  >
                    <div
                      className={`font-mono text-3xl font-bold tracking-widest mb-2 ${
                        gameState?.winner === "red"
                          ? "text-cyan glow-cyan"
                          : gameState?.winner === "blue"
                            ? "text-magenta glow-magenta"
                            : "text-amber glow-amber"
                      }`}
                    >
                      {gameState?.winner === "red"
                        ? "VICTORY"
                        : gameState?.winner === "blue"
                          ? "DEFEATED"
                          : "DRAW"}
                    </div>
                    <p className="text-text-secondary text-xs font-mono">
                      {gameState?.status === "timeout" ? "TIME OUT" : "K.O."}
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live Debug — current tick actions */}
          {lastDebug && isFighting && (
            <div className="w-full max-w-lg flex gap-2 font-mono text-[10px]">
              <div className="flex-1 bg-bg-panel border border-border rounded-sm p-2">
                <span className="text-purple">[P]</span>{" "}
                <span className="text-text-secondary">{lastDebug.redAction.move}</span>{" "}
                <span className="text-amber">{lastDebug.redAction.action}</span>{" "}
                <span className="text-text-dim">{lastDebug.redLatency}ms</span>
              </div>
              <div className="flex-1 bg-bg-panel border border-border rounded-sm p-2">
                <span className="text-neon-green">[B]</span>{" "}
                <span className="text-text-secondary">{lastDebug.blueAction.move}</span>{" "}
                <span className="text-amber">{lastDebug.blueAction.action}</span>{" "}
                <span className="text-text-dim">{lastDebug.blueLatency}ms</span>
              </div>
            </div>
          )}

          {/* Combat Log */}
          <div className="w-full max-w-lg">
            <CombatLog logs={gameState?.log ?? []} />
          </div>

          {/* Post-Battle Analytics */}
          {usage && (
            <div className="w-full max-w-lg space-y-3">
              {/* Action Distribution */}
              {usage.analytics && (
                <div className="bg-bg-panel border border-border rounded-sm p-3 font-mono text-xs">
                  <h3 className="text-text-secondary uppercase tracking-wider text-[10px] mb-3">Battle Analytics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(["red", "blue"] as const).map((side) => {
                      const data = usage.analytics![side];
                      if (!data) return null;
                      const isPlayer = side === "red";
                      const totalActions = Object.values(data.actions).reduce((a, b) => a + b, 0);
                      const totalMoves = Object.values(data.moves).reduce((a, b) => a + b, 0);

                      return (
                        <div key={side}>
                          <div className={`font-bold mb-2 ${isPlayer ? "text-purple" : "text-neon-green"}`}>
                            {isPlayer ? "[P] PLAYER" : "[B] BOT"}
                          </div>

                          {/* Action bars */}
                          <div className="space-y-1 mb-3">
                            <span className="text-text-dim text-[10px]">ACTIONS</span>
                            {Object.entries(data.actions)
                              .sort(([, a], [, b]) => b - a)
                              .map(([action, count]) => {
                                const pct = totalActions > 0 ? (count / totalActions) * 100 : 0;
                                return (
                                  <div key={action} className="flex items-center gap-1">
                                    <span className="w-12 text-[10px] text-text-secondary">{action}</span>
                                    <div className="flex-1 h-2 bg-bg-deep rounded-sm overflow-hidden">
                                      <div
                                        className="h-full rounded-sm"
                                        style={{
                                          width: `${pct}%`,
                                          backgroundColor: action === "punch" || action === "heavy" ? "#ffb800"
                                            : action === "shoot" ? "#39ff14"
                                            : action === "block" || action === "dodge" ? "#00f0ff"
                                            : action === "parry" ? "#ff2d6a"
                                            : "#4a4a5e",
                                        }}
                                      />
                                    </div>
                                    <span className="w-8 text-right text-[10px] text-text-dim tabular-nums">{Math.round(pct)}%</span>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Move bars */}
                          <div className="space-y-1">
                            <span className="text-text-dim text-[10px]">MOVEMENT</span>
                            {Object.entries(data.moves)
                              .sort(([, a], [, b]) => b - a)
                              .map(([move, count]) => {
                                const pct = totalMoves > 0 ? (count / totalMoves) * 100 : 0;
                                const isVertical = move === "up" || move === "down";
                                return (
                                  <div key={move} className="flex items-center gap-1">
                                    <span className="w-12 text-[10px] text-text-secondary">{move}</span>
                                    <div className="flex-1 h-2 bg-bg-deep rounded-sm overflow-hidden">
                                      <div
                                        className="h-full rounded-sm"
                                        style={{
                                          width: `${pct}%`,
                                          backgroundColor: isVertical ? "#b44aff" : move === "none" ? "#4a4a5e" : "#7a7a8e",
                                        }}
                                      />
                                    </div>
                                    <span className="w-8 text-right text-[10px] text-text-dim tabular-nums">{Math.round(pct)}%</span>
                                  </div>
                                );
                              })}
                          </div>

                          <div className="mt-2 text-[10px] text-text-dim">
                            Avg latency: {data.avgLatency}ms
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cost breakdown */}
              <div className="bg-bg-panel border border-border rounded-sm p-3 font-mono text-[10px] text-text-dim">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-text-secondary uppercase tracking-wider">Battle Cost</span>
                  <span className="text-amber font-bold">${usage.costUSD.toFixed(4)}</span>
                </div>
                <div className="flex gap-4 mb-1">
                  <span>Calls: {usage.totalCalls}</span>
                  <span>In: {usage.totalInputTokens.toLocaleString()} tok</span>
                  <span>Out: {usage.totalOutputTokens.toLocaleString()} tok</span>
                  <span>Total: {usage.totalTokens.toLocaleString()} tok</span>
                </div>
                {usage.perModel.map((m) => (
                  <div key={m.model} className="flex gap-3 text-text-dim">
                    <span className="text-text-secondary">{m.model}</span>
                    <span>{m.calls} calls</span>
                    <span>{m.inputTokens.toLocaleString()}+{m.outputTokens.toLocaleString()} tok</span>
                    <span className="text-amber">${m.costUSD.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

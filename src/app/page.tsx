"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Arena } from "@/components/arena";
import { CombatLog } from "@/components/combat-log";
import type { Faction, GameState } from "@/lib/types";
import { FACTION_META } from "@/lib/types";
import { GAUNTLET_LEVELS, INITIAL_GAUNTLET, calculateScore, type GauntletState } from "@/lib/gauntlet";

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
  analytics?: { red: FighterAnalytics; blue: FighterAnalytics };
}

interface TickDebug {
  redAction: { move: string; action: string };
  blueAction: { move: string; action: string };
  redLatency?: number;
  blueLatency?: number;
}

const FACTIONS: Faction[] = ["anthropic", "google", "openai"];

function AnalyticsPanel({ data, label, color }: { data: FighterAnalytics; label: string; color: string }) {
  const totalActions = Object.values(data.actions).reduce((a, b) => a + b, 0);
  const totalMoves = Object.values(data.moves).reduce((a, b) => a + b, 0);

  const actionColors: Record<string, string> = {
    punch: "#ffb800", heavy: "#ffb800", shoot: "#39ff14",
    block: "#00f0ff", dodge: "#00f0ff", parry: "#ff2d6a", none: "#4a4a5e",
  };

  return (
    <div className="bg-bg-surface border border-border rounded-sm p-2">
      <div className={`font-bold mb-1.5 flex justify-between text-[10px]`} style={{ color }}>
        <span>{label}</span>
        <span className="text-text-dim font-normal">{data.avgLatency}ms avg</span>
      </div>
      <div className="space-y-0.5 mb-2">
        <span className="text-text-dim text-[8px] uppercase tracking-wider">Actions</span>
        {Object.entries(data.actions).sort(([, a], [, b]) => b - a).map(([action, count]) => {
          const pct = totalActions > 0 ? (count / totalActions) * 100 : 0;
          return (
            <div key={action} className="flex items-center gap-1">
              <span className="w-10 text-[9px] text-text-secondary">{action}</span>
              <div className="flex-1 h-1.5 bg-bg-deep rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: actionColors[action] || "#4a4a5e" }} />
              </div>
              <span className="w-8 text-right text-[9px] text-text-dim tabular-nums">{Math.round(pct)}%</span>
            </div>
          );
        })}
      </div>
      <div className="space-y-0.5">
        <span className="text-text-dim text-[8px] uppercase tracking-wider">Movement</span>
        {Object.entries(data.moves).sort(([, a], [, b]) => b - a).map(([move, count]) => {
          const pct = totalMoves > 0 ? (count / totalMoves) * 100 : 0;
          const isVert = move === "up" || move === "down";
          return (
            <div key={move} className="flex items-center gap-1">
              <span className="w-10 text-[9px] text-text-secondary">{move}</span>
              <div className="flex-1 h-1.5 bg-bg-deep rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: isVert ? "#b44aff" : move === "none" ? "#4a4a5e" : "#7a7a8e" }} />
              </div>
              <span className="w-8 text-right text-[9px] text-text-dim tabular-nums">{Math.round(pct)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState(
    "You are a smart tactical fighter. Keep medium distance. Shoot when far, punch when close. Dodge heavy attacks. Block when enemy is adjacent. Be unpredictable.",
  );
  const [faction, setFaction] = useState<Faction>("anthropic");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [lastDebug, setLastDebug] = useState<TickDebug | null>(null);
  const [isFighting, setIsFighting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Gauntlet state
  const [gauntlet, setGauntlet] = useState<GauntletState>(INITIAL_GAUNTLET);
  const [showGauntlet, setShowGauntlet] = useState(true);
  const [lastScore, setLastScore] = useState(0);

  // Load gauntlet from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("battleai_gauntlet");
    if (saved) {
      try { setGauntlet(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Save gauntlet to localStorage
  useEffect(() => {
    localStorage.setItem("battleai_gauntlet", JSON.stringify(gauntlet));
  }, [gauntlet]);

  const currentLevel = GAUNTLET_LEVELS[gauntlet.currentLevel] || null;

  const startBattle = useCallback(async (overrides?: {
    botPrompt: string; botName: string; botFaction: Faction; botHp: number;
  }) => {
    if (isFighting) {
      abortRef.current?.abort();
      setIsFighting(false);
      return;
    }

    setIsFighting(true);
    setGameState(null);
    setUsage(null);
    setLastDebug(null);
    setLastScore(0);
    abortRef.current = new AbortController();

    try {
      const body: Record<string, unknown> = {
        playerPrompt: prompt,
        playerFaction: faction,
      };

      if (overrides) {
        body.botPrompt = overrides.botPrompt;
        body.botName = overrides.botName;
        body.botFaction = overrides.botFaction;
        body.botHp = overrides.botHp;
      } else {
        body.botType = "balanced";
        body.botFaction = "openai";
      }

      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Battle failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalState: GameState | null = null;

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
                if (parsed._debug) setLastDebug(parsed._debug as TickDebug);
                finalState = parsed as GameState;
                setGameState(finalState);
              }
            } catch { /* skip */ }
          }
        }
      }

      // Gauntlet progression
      if (showGauntlet && currentLevel && finalState) {
        const won = finalState.winner === "red";
        const score = calculateScore(finalState.tick, finalState.fighters[0].hp, currentLevel.hp, won);
        setLastScore(score);

        setGauntlet((prev) => {
          const next = { ...prev };
          next.history = [...prev.history, {
            level: currentLevel.level,
            won,
            ticks: finalState!.tick,
            hpLeft: finalState!.fighters[0].hp,
            cost: 0,
          }];

          if (won) {
            next.wins++;
            next.totalScore += score;
            next.totalTokensEarned += currentLevel.tokenReward;
            next.ramUnlocked += currentLevel.tokenReward;
            if (next.currentLevel < GAUNTLET_LEVELS.length - 1) {
              next.currentLevel++;
            }
            // Unlock actions at certain levels
            if (currentLevel.level >= 3 && !next.unlockedActions.includes("heavy")) {
              next.unlockedActions.push("heavy");
            }
            if (currentLevel.level >= 5 && !next.unlockedActions.includes("parry")) {
              next.unlockedActions.push("parry");
            }
          } else {
            next.losses++;
          }
          return next;
        });
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Battle error:", e);
      }
    } finally {
      setIsFighting(false);
    }
  }, [prompt, faction, isFighting, showGauntlet, currentLevel]);

  const startGauntletBattle = useCallback(() => {
    if (!currentLevel) return;
    startBattle({
      botPrompt: currentLevel.prompt,
      botName: currentLevel.name,
      botFaction: currentLevel.faction,
      botHp: currentLevel.hp,
    });
  }, [currentLevel, startBattle]);

  const resetGauntlet = useCallback(() => {
    setGauntlet(INITIAL_GAUNTLET);
    setGameState(null);
    setUsage(null);
    setLastScore(0);
  }, []);

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
          {/* Mode toggle */}
          <div className="flex gap-1">
            <button onClick={() => setShowGauntlet(true)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded-sm border transition-all ${showGauntlet ? "border-magenta text-magenta bg-magenta/10" : "border-border text-text-dim hover:text-text-secondary"}`}>
              GAUNTLET
            </button>
            <button onClick={() => setShowGauntlet(false)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded-sm border transition-all ${!showGauntlet ? "border-cyan text-cyan bg-cyan/10" : "border-border text-text-dim hover:text-text-secondary"}`}>
              FREE RUN
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px]">
          {showGauntlet && (
            <>
              <span className="text-text-dim">SCORE</span>
              <span className="text-amber tabular-nums font-bold">{gauntlet.totalScore.toLocaleString()}</span>
              <span className="text-text-dim">RAM</span>
              <span className="text-cyan tabular-nums">{gauntlet.ramUnlocked}</span>
              <span className="text-text-dim">W/L</span>
              <span className="text-neon-green tabular-nums">{gauntlet.wins}</span>
              <span className="text-text-dim">/</span>
              <span className="text-magenta tabular-nums">{gauntlet.losses}</span>
            </>
          )}
          {gameState && (
            <>
              <div className="h-3 w-px bg-border" />
              <span className="text-text-dim">CYCLE</span>
              <span className="text-cyan tabular-nums">{String(gameState.tick).padStart(3, "0")}</span>
              {gameState.tick >= 30 && (
                <span className="text-magenta animate-pulse-glow text-[9px]">FIREWALL</span>
              )}
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex gap-0 overflow-hidden">
        {/* Left Panel */}
        <div className="w-72 shrink-0 flex flex-col border-r border-border bg-bg-panel overflow-y-auto">
          {/* Prompt */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-cyan text-[10px] font-mono uppercase tracking-widest glow-cyan">
                &gt; Construct Code_
              </label>
              <span className="text-text-dim text-[9px] font-mono tabular-nums">
                {prompt.length}/{showGauntlet ? gauntlet.ramUnlocked : "∞"} RAM
              </span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => {
                const max = showGauntlet ? gauntlet.ramUnlocked : Infinity;
                if (e.target.value.length <= max) setPrompt(e.target.value);
              }}
              className="w-full h-32 bg-bg-deep border border-border-bright rounded-sm p-2 text-xs font-mono text-cyan/90 resize-none focus:outline-none focus:border-cyan focus:shadow-[0_0_10px_#00f0ff22] transition-all leading-relaxed"
              placeholder="// Define your construct..."
              disabled={isFighting}
              spellCheck={false}
            />
          </div>

          {/* Faction */}
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

          {/* Gauntlet levels or Free config */}
          {showGauntlet ? (
            <div className="p-3 border-b border-border flex-1 overflow-y-auto">
              <label className="text-text-secondary text-[9px] font-mono uppercase tracking-widest block mb-2">ICE Breaker Gauntlet</label>
              <div className="space-y-1">
                {GAUNTLET_LEVELS.map((lvl, i) => {
                  const isCurrent = i === gauntlet.currentLevel;
                  const isBeaten = i < gauntlet.currentLevel;
                  const isLocked = i > gauntlet.currentLevel;
                  const levelResult = gauntlet.history.filter(h => h.level === lvl.level);
                  const meta = FACTION_META[lvl.faction];

                  return (
                    <div key={lvl.level}
                      className={`px-2 py-1.5 rounded-sm border text-[9px] font-mono transition-all ${
                        isCurrent ? "border-magenta bg-bg-elevated" :
                        isBeaten ? "border-neon-green/30 bg-bg-deep" :
                        "border-border bg-bg-deep opacity-40"
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${isCurrent ? "text-magenta" : isBeaten ? "text-neon-green" : "text-text-dim"}`}>
                          {isBeaten ? "✓ " : isLocked ? "◆ " : "▸ "}{lvl.name}
                        </span>
                        <span className="text-text-dim">{lvl.hp} ICE</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span style={{ color: meta.color }} className="text-[8px]">{meta.label}</span>
                        <span className="text-amber text-[8px]">+{lvl.tokenReward} RAM</span>
                        {isBeaten && levelResult.length > 0 && (
                          <span className="text-neon-green text-[8px]">
                            {levelResult[levelResult.length - 1].ticks}t
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 border-b border-border">
              <label className="text-text-secondary text-[9px] font-mono uppercase tracking-widest block mb-1.5">Free Run — any target</label>
              <p className="text-text-dim text-[9px] font-mono">Select faction above, then JACK IN</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="p-3 space-y-2 shrink-0">
            {showGauntlet ? (
              <>
                <motion.button
                  onClick={startGauntletBattle}
                  disabled={!currentLevel}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                  className={`w-full py-3 rounded-sm font-mono font-bold text-sm uppercase tracking-[0.4em] transition-all ${
                    isFighting ? "bg-magenta/20 border-2 border-magenta text-magenta" :
                    "bg-cyan/10 border-2 border-cyan text-cyan hover:bg-cyan/20"
                  }`}
                  style={{ boxShadow: isFighting ? "var(--glow-magenta)" : "var(--glow-cyan)" }}>
                  {isFighting ? "ABORT" : currentLevel ? `LVL ${currentLevel.level} — JACK IN` : "GAUNTLET COMPLETE"}
                </motion.button>
                <button onClick={resetGauntlet} className="w-full text-[9px] font-mono text-text-dim hover:text-magenta transition-colors">
                  RESET GAUNTLET
                </button>
              </>
            ) : (
              <motion.button
                onClick={() => startBattle()}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                className={`w-full py-3 rounded-sm font-mono font-bold text-sm uppercase tracking-[0.4em] transition-all ${
                  isFighting ? "bg-magenta/20 border-2 border-magenta text-magenta" :
                  "bg-cyan/10 border-2 border-cyan text-cyan hover:bg-cyan/20"
                }`}
                style={{ boxShadow: isFighting ? "var(--glow-magenta)" : "var(--glow-cyan)" }}>
                {isFighting ? "ABORT" : "JACK IN"}
              </motion.button>
            )}
          </div>

          {/* Cost */}
          {usage && (
            <div className="px-3 pb-2 font-mono text-[9px] text-text-dim shrink-0">
              <span className="text-amber">${usage.costUSD.toFixed(4)}</span> | {usage.totalCalls} calls | {usage.totalTokens.toLocaleString()} tok
            </div>
          )}
        </div>

        {/* Center — Arena */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 min-w-0 p-3 overflow-y-auto">
          {/* Gauntlet victory score */}
          {showGauntlet && isOver && lastScore > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="font-mono text-center">
              <span className="text-amber text-lg font-bold glow-amber">+{lastScore.toLocaleString()} PTS</span>
              {currentLevel && (
                <span className="text-cyan text-xs ml-3">+{currentLevel.tokenReward} RAM</span>
              )}
            </motion.div>
          )}

          {/* HP bars */}
          {gameState && (
            <div className="w-full max-w-lg flex items-center gap-3 font-mono text-[11px]">
              <div className="flex-1">
                <div className="flex justify-between mb-0.5">
                  <span className="font-bold" style={{ color: FACTION_META[gameState.fighters[0].faction].color }}>[P] {gameState.fighters[0].name}</span>
                  <span className="text-text-secondary tabular-nums">{gameState.fighters[0].hp}/{gameState.fighters[0].maxHp} ICE</span>
                </div>
                <div className="h-2 bg-bg-deep border border-border rounded-sm overflow-hidden">
                  <motion.div className="h-full"
                    style={{ backgroundColor: gameState.fighters[0].hp > 5 ? "#39ff14" : gameState.fighters[0].hp > 2 ? "#ffb800" : "#ff2d6a" }}
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
                  <motion.div className="h-full ml-auto"
                    style={{ backgroundColor: gameState.fighters[1].hp > 5 ? "#39ff14" : gameState.fighters[1].hp > 2 ? "#ffb800" : "#ff2d6a" }}
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

          {/* Analytics — below arena */}
          {usage?.analytics && (
            <div className="w-full max-w-lg grid grid-cols-2 gap-2 font-mono text-[9px]">
              {usage.analytics.red && <AnalyticsPanel data={usage.analytics.red} label="[P] PLAYER" color="#b44aff" />}
              {usage.analytics.blue && <AnalyticsPanel data={usage.analytics.blue} label="[B] BOT" color="#39ff14" />}
            </div>
          )}
        </div>

        {/* Right Panel — Intrusion Log */}
        <div className="w-72 shrink-0 flex flex-col border-l border-border bg-bg-panel overflow-hidden">
          <div className="flex-1 min-h-0">
            <CombatLog logs={gameState?.log ?? []} />
          </div>
        </div>
      </main>
    </div>
  );
}

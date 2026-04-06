"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Arena } from "@/components/arena";
import { CombatLog } from "@/components/combat-log";
import { SysopReport } from "@/components/sysop-report";
import { SysopTerminal } from "@/components/sysop-terminal";
import { BootLines } from "@/components/boot-sequence";
import type { Faction, GameState } from "@/lib/types";
import { FACTION_META } from "@/lib/types";
import { GAUNTLET_LEVELS, INITIAL_GAUNTLET, TUTORIAL_COUNT, calculateScore, type GauntletState } from "@/lib/gauntlet";

interface FighterAnalytics {
  moves: Record<string, number>;
  actions: Record<string, number>;
  avgLatency: number;
  totalLatency: number;
  count: number;
  totalDmgDealt: number;
  totalDmgBlocked: number;
  totalDmgDodged: number;
  shotsHit: number;
  shotsFired: number;
  shotAccuracy: number;
  punchesHit: number;
  punchesFired: number;
  heavyHit: number;
  heavyFired: number;
  parrySuccess: number;
  parryAttempts: number;
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

// Fixed order + lore tooltips for all actions and moves
const ACTION_DEFS = [
  { key: "punch", label: "burn", color: "#ffb800", tip: "BURN — Close-range neural spike. 2 DMG, range 2. The backbone of any intrusion." },
  { key: "shoot", label: "spike", color: "#39ff14", tip: "SPIKE — Long-range ICE breaker. 1 DMG, range 1-5. Accuracy: 100% at dist 1, 35% at dist 5. Safe but weak." },
  { key: "heavy", label: "hammer", color: "#ff8800", tip: "HAMMER — Overclocked memory dump. 3 DMG, range 2, cooldown 3. High voltage, high reward." },
  { key: "block", label: "shield", color: "#00f0ff", tip: "SHIELD — Firewall hardening. Halves melee DMG, blocks spikes. Passive but predictable." },
  { key: "dodge", label: "ghost", color: "#00d4ff", tip: "GHOST — Quantum state shift. Invulnerable 1 cycle. Cooldown 4. Disappear from the grid." },
  { key: "parry", label: "b.ice", color: "#ff2d6a", tip: "BLACK ICE — Counter-intrusion trap. If enemy attacks: STUN + your next hit is 2x. Miss = wasted cycle. Cooldown 5." },
  { key: "none", label: "idle", color: "#4a4a5e", tip: "IDLE — No action executed. Your construct froze or failed to respond." },
];

const MOVE_DEFS = [
  { key: "up", label: "north", color: "#b44aff", tip: "NORTH — Vertical displacement. Use to flank or evade lateral fire." },
  { key: "down", label: "south", color: "#b44aff", tip: "SOUTH — Vertical displacement. Mirror of north vector." },
  { key: "left", label: "west", color: "#7a7a8e", tip: "WEST — Horizontal retreat. Increases distance from target." },
  { key: "right", label: "east", color: "#7a7a8e", tip: "EAST — Horizontal advance. Closes distance to target." },
  { key: "none", label: "hold", color: "#4a4a5e", tip: "HOLD — No movement. Your construct held position." },
];

function AnalyticsPanel({ data, label, color }: { data: FighterAnalytics; label: string; color: string }) {
  const totalActions = Math.max(1, Object.values(data.actions).reduce((a, b) => a + b, 0));
  const totalMoves = Math.max(1, Object.values(data.moves).reduce((a, b) => a + b, 0));

  return (
    <div className="bg-bg-surface border border-border rounded-sm p-2">
      <div className="font-bold mb-1.5 flex justify-between text-[10px]" style={{ color }}>
        <span>{label}</span>
        <span className="text-text-dim font-normal" title="Average neural response latency per cycle">{data.avgLatency}ms avg</span>
      </div>
      <div className="space-y-0.5 mb-2">
        <span className="text-text-dim text-[8px] uppercase tracking-wider">Subroutines</span>
        {ACTION_DEFS.map(({ key, label, color: barColor, tip }) => {
          const count = data.actions[key] || 0;
          const pct = (count / totalActions) * 100;
          return (
            <div key={key} className="flex items-center gap-1 group relative" title={tip}>
              <span className="w-10 text-[9px] text-text-secondary cursor-help">{label}</span>
              <div className="flex-1 h-1.5 bg-bg-deep rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
              <span className="w-8 text-right text-[9px] text-text-dim tabular-nums">{Math.round(pct)}%</span>
            </div>
          );
        })}
      </div>
      <div className="space-y-0.5">
        <span className="text-text-dim text-[8px] uppercase tracking-wider">Vectors</span>
        {MOVE_DEFS.map(({ key, label, color: barColor, tip }) => {
          const count = data.moves[key] || 0;
          const pct = (count / totalMoves) * 100;
          return (
            <div key={key} className="flex items-center gap-1" title={tip}>
              <span className="w-10 text-[9px] text-text-secondary cursor-help">{label}</span>
              <div className="flex-1 h-1.5 bg-bg-deep rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
              <span className="w-8 text-right text-[9px] text-text-dim tabular-nums">{Math.round(pct)}%</span>
            </div>
          );
        })}
      </div>
      {/* Combat stats */}
      <div className="mt-1.5 pt-1.5 border-t border-border space-y-0.5">
        <span className="text-text-dim text-[8px] uppercase tracking-wider">Combat Data</span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
          <div className="flex justify-between" title="Total ICE damage dealt to enemy">
            <span className="text-text-secondary">DMG dealt</span>
            <span className="text-amber tabular-nums font-bold">{data.totalDmgDealt}</span>
          </div>
          <div className="flex justify-between" title="Total damage absorbed by SHIELD subroutine">
            <span className="text-text-secondary">DMG blocked</span>
            <span className="text-cyan tabular-nums">{data.totalDmgBlocked}</span>
          </div>
          <div className="flex justify-between" title="PING accuracy — hits / total shots fired">
            <span className="text-text-secondary">Shot acc.</span>
            <span className={`tabular-nums ${(data.shotAccuracy || 0) >= 50 ? "text-neon-green" : "text-magenta"}`}>
              {data.shotAccuracy || 0}% <span className="text-text-dim">({data.shotsHit}/{data.shotsFired})</span>
            </span>
          </div>
          <div className="flex justify-between" title="Times PHASE subroutine avoided damage">
            <span className="text-text-secondary">Dodged</span>
            <span className="text-cyan tabular-nums">{data.totalDmgDodged}</span>
          </div>
          <div className="flex justify-between" title="BURN hits / total attempts">
            <span className="text-text-secondary">Punch</span>
            <span className="text-text-dim tabular-nums">{data.punchesHit}/{data.punchesFired}</span>
          </div>
          <div className="flex justify-between" title="HAMMER hits / total attempts">
            <span className="text-text-secondary">Heavy</span>
            <span className="text-text-dim tabular-nums">{data.heavyHit}/{data.heavyFired}</span>
          </div>
          <div className="flex justify-between" title="BLACK ICE successful counters / total attempts">
            <span className="text-text-secondary">Parry</span>
            <span className={`tabular-nums ${(data.parrySuccess || 0) > 0 ? "text-magenta" : "text-text-dim"}`}>
              {data.parrySuccess || 0}/{data.parryAttempts || 0}
            </span>
          </div>
          <div className="flex justify-between" title="Average neural response time in milliseconds">
            <span className="text-text-secondary">Latency</span>
            <span className="text-text-dim tabular-nums">{data.avgLatency}ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState(
    "Move toward the enemy and attack. (rewrite me — this prompt is terrible)",
  );
  const [faction, setFaction] = useState<Faction>("anthropic");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [lastDebug, setLastDebug] = useState<TickDebug | null>(null);
  const [isFighting, setIsFighting] = useState(false);
  const [crackedPrompt, setCrackedPrompt] = useState<string | null>(null);
  const [showCracked, setShowCracked] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Gauntlet state
  const [gauntlet, setGauntlet] = useState<GauntletState>(INITIAL_GAUNTLET);
  const [showGauntlet, setShowGauntlet] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [uiVisible, setUiVisible] = useState(false); // prevents flash — stays false until hydration decides
  const [lastScore, setLastScore] = useState(0);
  const [gauntletLevelPlayed, setGauntletLevelPlayed] = useState<number | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [spotlightPrompt, setSpotlightPrompt] = useState(false); // dims everything except prompt
  const [bootPhase, setBootPhase] = useState<"idle" | "blackout" | "boot" | "flicker" | "done">("idle");
  const [hasBooted, setHasBooted] = useState(false);
  const [flickerKey, setFlickerKey] = useState(0); // increment to re-trigger CSS animations
  const [runnerName, setRunnerName] = useState<string | null>(null);

  // Load gauntlet from localStorage + hydrate
  useEffect(() => {
    const saved = localStorage.getItem("battleai_gauntlet");
    if (saved) {
      try { setGauntlet(JSON.parse(saved)); } catch { /* ignore */ }
    }
    // Show onboarding if first visit
    const onboardingDone = localStorage.getItem("battleai_onboarding_done");
    const isFirstVisit = !onboardingDone;
    if (isFirstVisit) {
      setShowOnboarding(true);
    } else {
      setUiVisible(true); // returning user — show UI immediately
    }
    // Check if first boot already happened
    const booted = localStorage.getItem("battleai_first_boot");
    if (booted) setHasBooted(true);
    // Load runner name
    try {
      const runner = JSON.parse(localStorage.getItem("battleai_runner") || "null");
      if (runner?.name) setRunnerName(runner.name);
    } catch { /* ignore */ }
    setShowGauntlet(true);
    setHydrated(true);
  }, []);

  // Save gauntlet to localStorage
  useEffect(() => {
    localStorage.setItem("battleai_gauntlet", JSON.stringify(gauntlet));
  }, [gauntlet]);

  const currentLevel = GAUNTLET_LEVELS[gauntlet.currentLevel] || null;

  // Gauntlet progression — triggers when battle ends
  useEffect(() => {
    if (isFighting || !gameState || gauntletLevelPlayed === null) return;
    const isFinished = gameState.status === "ko" || gameState.status === "timeout";
    if (!isFinished) return;

    const level = GAUNTLET_LEVELS[gauntletLevelPlayed];
    if (!level) return;

    const won = gameState.winner === "red";
    const isDraw = gameState.winner === "draw";
    const score = calculateScore(gameState.tick, gameState.fighters[0].hp, level.hp, won);
    setLastScore(score);
    setGauntletLevelPlayed(null); // consume — don't re-trigger

    setGauntlet((prev) => {
      const next = { ...prev };
      next.history = [...prev.history, {
        level: level.level,
        won,
        ticks: gameState.tick,
        hpLeft: gameState.fighters[0].hp,
        cost: 0,
        crackedPrompt: won ? level.prompt : undefined,
      }];

      if (won) {
        next.wins++;
        next.totalScore += score;
        next.totalTokensEarned += level.tokenReward;
        next.ramUnlocked += level.tokenReward;
        if (next.currentLevel < GAUNTLET_LEVELS.length - 1) {
          next.currentLevel++;
        }
        // Unlock actions from next level's allowedActions
        const nextLevel = GAUNTLET_LEVELS[next.currentLevel];
        if (nextLevel?.allowedActions) {
          for (const action of nextLevel.allowedActions) {
            if (!next.unlockedActions.includes(action)) {
              next.unlockedActions = [...next.unlockedActions, action];
            }
          }
        }
        // Unlock parry at gauntlet level 8 (Warez Daemon)
        if (level.level >= 8 && !next.unlockedActions.includes("parry")) {
          next.unlockedActions = [...next.unlockedActions, "parry"];
        }
      } else if (isDraw) {
        next.draws++;
      } else {
        next.losses++;
      }
      return next;
    });
  }, [isFighting, gameState, gauntletLevelPlayed]);

  const startBattleRaw = useCallback(async (overrides?: {
    botPrompt: string; botName: string; botFaction: Faction; botHp: number;
    allowedActions?: string[]; arenaWidth?: number; arenaHeight?: number; playerHp?: number;
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
        if (overrides.allowedActions) body.allowedActions = overrides.allowedActions;
        if (overrides.arenaWidth) body.arenaWidth = overrides.arenaWidth;
        if (overrides.arenaHeight) body.arenaHeight = overrides.arenaHeight;
        if (overrides.playerHp) body.playerHp = overrides.playerHp;
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

      // nothing here — progression handled by useEffect
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Battle error:", e);
      }
    } finally {
      setIsFighting(false);
    }
  }, [prompt, faction, isFighting]);

  // Pending battle overrides — stored so boot sequence can trigger battle after completing
  const pendingBattleRef = useRef<Parameters<typeof startBattleRaw>[0] | undefined>(undefined);
  const bootPurposeRef = useRef<"onboarding" | "battle">("battle");

  const finishBoot = useCallback(() => {
    setBootPhase("done");
    setFlickerKey((k) => k + 1); // trigger CSS flicker-in on panels
    setUiVisible(true); // reveal UI
    if (!hasBooted) {
      setHasBooted(true);
      localStorage.setItem("battleai_first_boot", "1");
    }
    if (bootPurposeRef.current === "battle") {
      startBattleRaw(pendingBattleRef.current);
    } else {
      // Onboarding boot — reveal UI with spotlight
      setSpotlightPrompt(true);
    }
  }, [hasBooted, startBattleRaw]);

  // Triggered by "ENTER THE MATRIX" — boot sequence to reveal UI
  const enterMatrix = useCallback((name: string) => {
    setShowOnboarding(false);
    setRunnerName(name);
    localStorage.setItem("battleai_onboarding_done", "1");
    bootPurposeRef.current = "onboarding";
    setBootPhase("blackout");
    setTimeout(() => setBootPhase("boot"), 500);
  }, []);

  // Boot sequence wrapper for battles
  const startBattle = useCallback((overrides?: Parameters<typeof startBattleRaw>[0]) => {
    setSpotlightPrompt(false);
    pendingBattleRef.current = overrides;
    bootPurposeRef.current = "battle";

    // First battle after onboarding boot — short flicker only
    // Full boot already happened at ENTER THE MATRIX
    setBootPhase("flicker");
  }, []);

  // When flicker phase starts, wait for animation then finish boot
  useEffect(() => {
    if (bootPhase !== "flicker") return;
    const delay = hasBooted ? 400 : 1200;
    const timer = setTimeout(finishBoot, delay);
    return () => clearTimeout(timer);
  }, [bootPhase, hasBooted, finishBoot]);

  const startGauntletBattle = useCallback(() => {
    if (!currentLevel) return;
    setGauntletLevelPlayed(gauntlet.currentLevel);
    setCrackedPrompt(currentLevel.prompt);
    setShowCracked(false);
    startBattle({
      botPrompt: currentLevel.prompt,
      botName: currentLevel.name,
      botFaction: currentLevel.faction,
      botHp: currentLevel.hp,
      allowedActions: currentLevel.allowedActions,
      arenaWidth: currentLevel.arenaWidth,
      arenaHeight: currentLevel.arenaHeight,
      playerHp: currentLevel.playerHp,
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
      <header className={`border-b border-border bg-bg-panel px-4 py-1 flex items-center justify-between shrink-0 transition-all duration-500 ${!uiVisible ? "invisible" : ""} ${spotlightPrompt ? "opacity-20" : ""}`}>
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-base font-bold tracking-[0.25em] glow-cyan text-cyan animate-flicker">
            BATTLE<span className="text-magenta">AI</span>
          </h1>
          {runnerName && (
            <span className="text-neon-green/60 text-[9px] font-mono">{runnerName}</span>
          )}
          <div className="h-3 w-px bg-border" />
          {/* Mode toggle */}
          <div className="flex gap-1">
            <a href="/lore"
              className="text-[9px] font-mono px-2 py-0.5 rounded-sm border border-amber/40 text-amber hover:bg-amber/10 transition-all animate-pulse-glow">
              1 NEW MSG
            </a>
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
          {hydrated && showGauntlet && (
            <>
              <span className="text-text-dim">SCORE</span>
              <span className="text-amber tabular-nums font-bold">{gauntlet.totalScore.toLocaleString()}</span>
              <span className="text-text-dim">RAM</span>
              <span className="text-cyan tabular-nums">{gauntlet.ramUnlocked}</span>
              <span className="text-text-dim">W/D/L</span>
              <span className="text-neon-green tabular-nums">{gauntlet.wins}</span>
              <span className="text-text-dim">/</span>
              <span className="text-amber tabular-nums">{gauntlet.draws ?? 0}</span>
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

      <main className="flex-1 flex gap-0 overflow-hidden relative">
        {/* Boot sequence overlay — covers entire main area */}
        <AnimatePresence>
          {bootPhase === "blackout" && (
            <motion.div
              key="blackout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-40 bg-black flex items-center justify-center"
            >
              <span className="text-neon-green/30 text-[10px] font-mono animate-pulse">JACKING IN...</span>
            </motion.div>
          )}
          {bootPhase === "boot" && (
            <motion.div
              key="boot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center font-mono text-[10px] text-neon-green/60 gap-1"
            >
              <BootLines faction={faction} level={currentLevel?.name} runner={runnerName} onDone={() => setBootPhase("flicker")} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen SYSOP Terminal — first visit onboarding */}
        <AnimatePresence>
          {hydrated && showOnboarding && !gameState && bootPhase === "idle" && (
            <motion.div
              key="sysop-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              className="absolute inset-0 z-30 bg-bg-deep flex items-center justify-center"
            >
              <SysopTerminal onDismiss={enterMatrix} />
            </motion.div>
          )}
        </AnimatePresence>


        {/* Left Panel */}
        <div key={`left-${flickerKey}`} className={`w-72 shrink-0 flex flex-col border-r border-border bg-bg-panel overflow-y-auto ${!uiVisible ? "invisible" : ""}`} style={flickerKey > 0 ? { animation: "flicker-in 0.5s ease-out forwards, glow-surge 0.8s ease-out 0.5s" } : undefined}>
          {/* Prompt */}
          <div className={`p-3 border-b border-border transition-all duration-500 ${spotlightPrompt ? "ring-1 ring-cyan/30 bg-bg-panel" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-cyan text-[10px] font-mono uppercase tracking-widest glow-cyan flex items-center gap-1.5">
                &gt; System Prompt_
                <span className="text-text-dim text-[8px] border border-text-dim/30 rounded-full w-3 h-3 flex items-center justify-center cursor-help hover:text-cyan hover:border-cyan/50 transition-colors" title="Your combat prompt — tell your AI construct how to fight: when to attack, dodge, block, or retreat. The better your instructions, the smarter it fights. Limited by RAM.">?</span>
              </label>
              <span className={`text-[9px] font-mono tabular-nums ${showGauntlet && prompt.length > gauntlet.ramUnlocked ? "text-magenta" : "text-text-dim"}`}>
                {prompt.length}/{showGauntlet ? gauntlet.ramUnlocked : "∞"} RAM
              </span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={`w-full h-32 bg-bg-deep border rounded-sm p-2 text-xs font-mono resize-none focus:outline-none transition-all leading-relaxed ${
                showGauntlet && prompt.length > gauntlet.ramUnlocked
                  ? "border-magenta text-magenta/90 shadow-[0_0_10px_#ff2d6a22]"
                  : "border-border-bright text-cyan/90 focus:border-cyan focus:shadow-[0_0_10px_#00f0ff22]"
              }`}
              placeholder="// Define your construct..."
              disabled={isFighting}
              spellCheck={false}
              autoFocus={spotlightPrompt}
            />
            {spotlightPrompt && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-cyan/60 text-[9px] font-mono mt-1.5 animate-pulse-glow"
              >
                ↑ Rewrite this. Your prompt is your only weapon. Then hit JACK IN below.
              </motion.p>
            )}
          </div>

          {/* Faction */}
          <div className={`p-3 border-b border-border transition-all duration-500 ${spotlightPrompt ? "bg-bg-panel" : ""}`}>
            <label className="text-text-secondary text-[9px] font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              Zaibatsu
              <span className="text-text-dim text-[8px] border border-text-dim/30 rounded-full w-3 h-3 flex items-center justify-center cursor-help hover:text-cyan hover:border-cyan/50 transition-colors" title="Choose which AI corporation powers your construct. Each zaibatsu (Anthropic, Google, OpenAI) thinks differently — some are fast, some are creative, some are precise.">?</span>
            </label>
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
            <div className={`p-3 border-b border-border flex-1 overflow-y-auto transition-all duration-500 ${spotlightPrompt ? "opacity-10 pointer-events-none" : ""}`}>
              <label className="text-text-secondary text-[9px] font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
                {gauntlet.currentLevel < TUTORIAL_COUNT ? "Training Protocol" : "ICE Breaker Gauntlet"}
                <span className="text-text-dim text-[8px] border border-text-dim/30 rounded-full w-3 h-3 flex items-center justify-center cursor-help hover:text-cyan hover:border-cyan/50 transition-colors" title={gauntlet.currentLevel < TUTORIAL_COUNT ? "Complete training to learn combat mechanics. Each level unlocks a new ability." : "15 levels of escalating difficulty. Beat each ICE barrier to steal the enemy's prompt, earn RAM, and unlock new abilities."}>?</span>
              </label>
              <div className="space-y-1">
                {GAUNTLET_LEVELS.map((lvl, i) => {
                  const isCurrent = i === gauntlet.currentLevel;
                  const isBeaten = i < gauntlet.currentLevel;
                  const isLocked = i > gauntlet.currentLevel;
                  const levelResult = gauntlet.history.filter(h => h.level === lvl.level);
                  const meta = FACTION_META[lvl.faction];
                  const tutorialComplete = gauntlet.currentLevel >= TUTORIAL_COUNT;
                  const isGauntletLevel = !lvl.isTutorial;

                  // Hide gauntlet levels if tutorial not complete
                  if (isGauntletLevel && !tutorialComplete) {
                    if (i === TUTORIAL_COUNT) {
                      return (
                        <div key="locked" className="px-2 py-2 rounded-sm border border-border bg-bg-deep text-center">
                          <span className="text-text-dim text-[9px] font-mono">LOCKED — Complete training to access the gauntlet</span>
                        </div>
                      );
                    }
                    return null;
                  }

                  const winEntry = levelResult.find(h => h.won && h.crackedPrompt);
                  const isExpanded = expandedLevel === lvl.level;

                  // Section headers
                  const showTutorialHeader = i === 0;
                  const showGauntletHeader = i === TUTORIAL_COUNT && tutorialComplete;

                  return (
                    <div key={lvl.level}>
                      {showTutorialHeader && (
                        <div className="text-neon-green/30 text-[8px] font-mono uppercase tracking-widest mb-1">Training</div>
                      )}
                      {showGauntletHeader && (
                        <div className="text-cyan/30 text-[8px] font-mono uppercase tracking-widest mt-2 mb-1">ICE Gauntlet</div>
                      )}
                      <button
                        onClick={() => isBeaten ? setExpandedLevel(isExpanded ? null : lvl.level) : undefined}
                        className={`w-full px-2 py-1.5 rounded-sm border text-[9px] font-mono transition-all text-left ${
                          isCurrent ? (lvl.isTutorial ? "border-neon-green bg-bg-elevated" : "border-magenta bg-bg-elevated") :
                          isBeaten ? "border-neon-green/30 bg-bg-deep hover:border-neon-green/60 cursor-pointer" :
                          "border-border bg-bg-deep opacity-40 cursor-default"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-bold ${isCurrent ? (lvl.isTutorial ? "text-neon-green" : "text-magenta") : isBeaten ? "text-neon-green" : "text-text-dim"}`}>
                            {isBeaten ? "✓ " : isLocked ? "◆ " : "▸ "}{lvl.isTutorial ? lvl.title.replace("Training — ", "") : lvl.name}
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
                          {isBeaten && winEntry && (
                            <span className="text-magenta text-[8px]">{isExpanded ? "▾" : "▸"} CODE</span>
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mx-1 mt-0.5 mb-1 space-y-1">
                          {winEntry?.sysopReport && (
                            <div className="bg-bg-deep border border-cyan/20 rounded-sm p-1.5">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-cyan text-[8px] font-mono">&gt; sysop_report</span>
                                <button onClick={() => navigator.clipboard.writeText(winEntry.sysopReport!)}
                                  className="text-[7px] font-mono text-text-dim hover:text-cyan">COPY</button>
                              </div>
                              <p className="text-text-primary/80 text-[8px] font-mono leading-relaxed">{winEntry.sysopReport}</p>
                            </div>
                          )}
                          {winEntry?.crackedPrompt && (
                            <div className="bg-bg-deep border border-magenta/20 rounded-sm p-1.5">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-magenta text-[8px] font-mono animate-flicker">&gt; cracked_code</span>
                                <button onClick={() => navigator.clipboard.writeText(winEntry.crackedPrompt!)}
                                  className="text-[7px] font-mono text-text-dim hover:text-cyan">COPY</button>
                              </div>
                              <p className="text-neon-green/70 text-[8px] font-mono leading-relaxed">{winEntry.crackedPrompt}</p>
                            </div>
                          )}
                        </div>
                      )}
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

          {/* Pre-battle SYSOP hint for tutorial levels */}
          {showGauntlet && currentLevel?.preHint && !isFighting && !isOver && (
            <div className="px-3 py-2 border-b border-neon-green/10">
              <div className="text-neon-green/40 text-[8px] font-mono uppercase tracking-widest mb-1">SYSOP&gt;</div>
              <p className="text-neon-green/70 text-[10px] font-mono leading-relaxed whitespace-pre-line">{currentLevel.preHint}</p>
            </div>
          )}

          {/* Unlock message after winning */}
          {showGauntlet && isOver && gameState?.winner === "red" && (() => {
            const justBeat = GAUNTLET_LEVELS[gauntlet.currentLevel - 1];
            return justBeat?.unlockMessage ? (
              <div className="px-3 py-2 border-b border-amber/20">
                <div className="text-amber text-[8px] font-mono uppercase tracking-widest mb-1 animate-pulse-glow">NEW UNLOCK</div>
                <p className="text-amber/80 text-[10px] font-mono leading-relaxed whitespace-pre-line">{justBeat.unlockMessage}</p>
              </div>
            ) : null;
          })()}

          {/* Action buttons */}
          <div className={`p-3 space-y-2 shrink-0 transition-all duration-500 ${spotlightPrompt ? "bg-bg-panel" : ""}`}>
            {showGauntlet ? (
              <>
                <motion.button
                  onClick={startGauntletBattle}
                  disabled={!currentLevel}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}
                  className={`w-full py-3 rounded-sm font-mono font-bold text-sm uppercase tracking-[0.4em] transition-all ${
                    isFighting ? "bg-magenta/20 border-2 border-magenta text-magenta" :
                    currentLevel?.isTutorial ? "bg-neon-green/10 border-2 border-neon-green text-neon-green hover:bg-neon-green/20" :
                    "bg-cyan/10 border-2 border-cyan text-cyan hover:bg-cyan/20"
                  }`}
                  style={{ boxShadow: isFighting ? "var(--glow-magenta)" : currentLevel?.isTutorial ? "var(--glow-green)" : "var(--glow-cyan)" }}>
                  {isFighting ? "ABORT" : currentLevel ? (currentLevel.isTutorial ? currentLevel.title.replace("Training — ", "TRAIN: ") : `LVL ${currentLevel.level - TUTORIAL_COUNT} — JACK IN`) : "GAUNTLET COMPLETE"}
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
        <div key={`center-${flickerKey}`} className={`flex-1 flex flex-col items-center gap-2 min-w-0 p-3 overflow-y-auto relative transition-all duration-500 ${gameState ? "justify-start pt-4" : "justify-center"} ${spotlightPrompt ? "opacity-10" : ""} ${!uiVisible ? "invisible" : ""}`} style={flickerKey > 0 ? { animation: "flicker-in 0.5s ease-out 0.15s forwards, glow-surge 0.8s ease-out 0.65s" } : undefined}>

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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center bg-bg-deep/85 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }} className="text-center">
                    <div className={`font-mono text-3xl font-bold tracking-widest mb-1 ${gameState?.winner === "red" ? "text-cyan glow-cyan" : gameState?.winner === "blue" ? "text-magenta glow-magenta" : "text-amber glow-amber"}`}>
                      {gameState?.winner === "red" ? "ICE CRACKED" : gameState?.winner === "blue" ? "FLATLINED" : "DRAW"}
                    </div>
                    <p className="text-text-secondary text-xs font-mono mb-3">{gameState?.status === "timeout" ? "TIME OUT" : "SYSTEM DOWN"}</p>

                    {/* Cracked prompt reveal */}
                    {gameState?.winner === "red" && crackedPrompt && !showCracked && (
                      <motion.button
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                        onClick={() => setShowCracked(true)}
                        className="text-[10px] font-mono text-magenta border border-magenta/50 rounded-sm px-3 py-1.5 hover:bg-magenta/10 transition-all animate-pulse-glow"
                      >
                        &gt; DECRYPT ENEMY CONSTRUCT CODE_
                      </motion.button>
                    )}
                    {gameState?.winner === "red" && showCracked && crackedPrompt && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-1 max-w-sm">
                        <div className="bg-bg-deep border border-magenta/30 rounded-sm p-2 text-left">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-magenta text-[9px] font-mono uppercase tracking-wider animate-flicker">&gt; decrypting neural template...</span>
                            <button onClick={() => { navigator.clipboard.writeText(crackedPrompt); }}
                              className="text-[8px] font-mono text-text-dim hover:text-cyan transition-colors">COPY</button>
                          </div>
                          <p className="text-neon-green/80 text-[10px] font-mono leading-relaxed">{crackedPrompt}</p>
                        </div>
                        <p className="text-text-dim text-[8px] font-mono mt-1 italic">
                          // Enemy construct code exposed. Study it. Adapt. Overcome.
                        </p>
                      </motion.div>
                    )}

                    {gameState?.winner === "blue" && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                        className="text-text-dim text-[9px] font-mono mt-2 max-w-xs">
                        // Your ICE failed, runner. The enemy construct code remains encrypted. Rewrite your neural template and try again.
                      </motion.p>
                    )}

                    {gameState?.winner === "draw" && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                        className="text-text-dim text-[9px] font-mono mt-2 max-w-xs">
                        // Mutual destruction. No data recovered. The matrix claims both constructs.
                      </motion.p>
                    )}
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

          {/* Analytics — below arena (collapsed by default, click to expand) */}
          {usage?.analytics && (
            <div className="w-full max-w-lg font-mono text-[9px]">
              <div className="flex justify-between items-center mb-1">
                <button
                  onClick={() => {
                    const el = document.getElementById("analytics-panels");
                    if (el) el.classList.toggle("hidden");
                  }}
                  className="text-[9px] font-mono text-text-dim hover:text-cyan transition-colors"
                >
                  ▸ ANALYTICS
                </button>
                <button
                  onClick={() => {
                    const lines: string[] = ["=== BATTLE ANALYTICS ===", ""];
                    for (const [side, label] of [["red", "PLAYER"], ["blue", "BOT"]] as const) {
                      const d = usage.analytics![side];
                      if (!d) continue;
                      const totalA = Math.max(1, Object.values(d.actions).reduce((a, b) => a + b, 0));
                      const totalM = Math.max(1, Object.values(d.moves).reduce((a, b) => a + b, 0));
                      lines.push(`[${label}] avg ${d.avgLatency}ms`);
                      lines.push("  Subroutines:");
                      for (const { key, label } of ACTION_DEFS) {
                        const c = d.actions[key] || 0;
                        lines.push(`    ${label.padEnd(6)} ${String(Math.round((c / totalA) * 100)).padStart(3)}%  (${c}x)`);
                      }
                      lines.push("  Vectors:");
                      for (const { key, label } of MOVE_DEFS) {
                        const c = d.moves[key] || 0;
                        lines.push(`    ${label.padEnd(6)} ${String(Math.round((c / totalM) * 100)).padStart(3)}%  (${c}x)`);
                      }
                      lines.push("  Combat:");
                      lines.push(`    DMG dealt:  ${d.totalDmgDealt}`);
                      lines.push(`    DMG blocked: ${d.totalDmgBlocked}`);
                      lines.push(`    DMG dodged:  ${d.totalDmgDodged}`);
                      lines.push(`    Shot acc:    ${d.shotAccuracy}% (${d.shotsHit}/${d.shotsFired})`);
                      lines.push(`    Punch:       ${d.punchesHit}/${d.punchesFired}`);
                      lines.push(`    Heavy:       ${d.heavyHit}/${d.heavyFired}`);
                      lines.push(`    Parry:       ${d.parrySuccess}/${d.parryAttempts}`);
                      lines.push(`    Latency:     ${d.avgLatency}ms`);
                      lines.push("");
                    }
                    if (gameState) {
                      lines.push(`Result: ${gameState.winner === "red" ? "VICTORY" : gameState.winner === "blue" ? "FLATLINED" : "DRAW"} | ${gameState.tick} cycles`);
                      lines.push(`Player ICE: ${gameState.fighters[0].hp}/${gameState.fighters[0].maxHp} | Bot ICE: ${gameState.fighters[1].hp}/${gameState.fighters[1].maxHp}`);
                    }
                    if (usage.costUSD) {
                      lines.push(`Cost: $${usage.costUSD.toFixed(4)} | ${usage.totalTokens.toLocaleString()} tokens`);
                    }
                    navigator.clipboard.writeText(lines.join("\n"));
                    const btn = document.getElementById("copy-analytics-btn");
                    if (btn) { btn.textContent = "COPIED"; setTimeout(() => { btn.textContent = "COPY STATS"; }, 1500); }
                  }}
                  id="copy-analytics-btn"
                  className="text-[9px] font-mono text-text-dim hover:text-cyan transition-colors border border-border rounded-sm px-2 py-0.5"
                >
                  COPY STATS
                </button>
              </div>
              <div id="analytics-panels" className="hidden grid grid-cols-2 gap-2">
                {usage.analytics.red && <AnalyticsPanel data={usage.analytics.red} label="[P] PLAYER" color="#b44aff" />}
                {usage.analytics.blue && <AnalyticsPanel data={usage.analytics.blue} label="[B] BOT" color="#39ff14" />}
              </div>
            </div>
          )}

          {/* SYSOP Report */}
          <SysopReport gameState={gameState} usage={usage} isOver={isOver} playerPrompt={prompt} onReport={(report) => {
            // Save SYSOP report to last gauntlet history entry
            setGauntlet((prev) => {
              if (prev.history.length === 0) return prev;
              const next = { ...prev, history: [...prev.history] };
              next.history[next.history.length - 1] = { ...next.history[next.history.length - 1], sysopReport: report };
              return next;
            });
          }} />
        </div>

        {/* Right Panel — Intrusion Log */}
        <div key={`right-${flickerKey}`} className={`w-72 shrink-0 flex flex-col border-l border-border bg-bg-panel overflow-hidden transition-all duration-500 ${spotlightPrompt ? "opacity-10" : ""} ${!uiVisible ? "invisible" : ""}`} style={flickerKey > 0 ? { animation: "flicker-in 0.5s ease-out 0.3s forwards, glow-surge 0.8s ease-out 0.8s" } : undefined}>
          <div className="flex-1 min-h-0">
            <CombatLog logs={gameState?.log ?? []} simplified={showGauntlet && gauntlet.currentLevel < TUTORIAL_COUNT} />
          </div>
        </div>
      </main>
    </div>
  );
}

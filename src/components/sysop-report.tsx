"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameState } from "@/lib/types";

interface SysopReportProps {
  gameState: GameState | null;
  usage: {
    analytics?: {
      red: { actions: Record<string, number>; totalDmgDealt: number; shotAccuracy: number; shotsHit: number; shotsFired: number; punchesHit: number; punchesFired: number; heavyHit: number; heavyFired: number; parrySuccess: number; parryAttempts: number; avgLatency: number };
      blue: { actions: Record<string, number>; totalDmgDealt: number; shotAccuracy: number; shotsHit: number; shotsFired: number; punchesHit: number; punchesFired: number; heavyHit: number; heavyFired: number; parrySuccess: number; parryAttempts: number; avgLatency: number };
    };
  } | null;
  isOver: boolean;
  onReport?: (report: string) => void;
}

export function SysopReport({ gameState, usage, isOver, onReport }: SysopReportProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-fetch report when battle ends
  useEffect(() => {
    if (!isOver || !gameState || !usage?.analytics) return;
    if (report || loading) return;

    fetchReport();
  }, [isOver, gameState, usage]);

  const fetchReport = useCallback(async () => {
    if (!gameState || !usage?.analytics) return;

    setLoading(true);
    try {
      const logs = gameState.log
        .filter((l) => l.type !== "move")
        .map((l) => `T${l.tick} [${l.fighter === "red" ? "P" : "B"}] ${l.message}`)
        .join("\n");

      const redStats = usage.analytics!.red;
      const blueStats = usage.analytics!.blue;
      const totalRedActions = Math.max(1, Object.values(redStats.actions).reduce((a, b) => a + b, 0));
      const totalBlueActions = Math.max(1, Object.values(blueStats.actions).reduce((a, b) => a + b, 0));

      const redActions = Object.entries(redStats.actions)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}=${Math.round((v / totalRedActions) * 100)}%`)
        .join(", ");
      const blueActions = Object.entries(blueStats.actions)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}=${Math.round((v / totalBlueActions) * 100)}%`)
        .join(", ");

      const winner = gameState.winner === "red" ? "PLAYER WINS" : gameState.winner === "blue" ? "PLAYER LOSES" : "DRAW";

      const summary = `Battle: ${winner}. ${gameState.tick} cycles. Player ${gameState.fighters[0].hp}/${gameState.fighters[0].maxHp} ICE. Bot ${gameState.fighters[1].hp}/${gameState.fighters[1].maxHp} ICE.

Player (${gameState.fighters[0].faction}): ${redActions}. DMG dealt: ${redStats.totalDmgDealt}. Shot acc: ${redStats.shotAccuracy}% (${redStats.shotsHit}/${redStats.shotsFired}). Parry: ${redStats.parrySuccess}/${redStats.parryAttempts}. Latency: ${redStats.avgLatency}ms.
Bot (${gameState.fighters[1].faction}, ${gameState.fighters[1].name}): ${blueActions}. DMG dealt: ${blueStats.totalDmgDealt}. Shot acc: ${blueStats.shotAccuracy}% (${blueStats.shotsHit}/${blueStats.shotsFired}). Latency: ${blueStats.avgLatency}ms.

Combat log:
${logs}`;

      const res = await fetch("/api/sysop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleSummary: summary }),
      });

      const data = await res.json();
      setReport(data.report);
      setVisible(true);
      onReport?.(data.report);
    } catch {
      setReport("SYSOP offline. Neural pathways corrupted. Run your own debrief, console cowboy.");
      setVisible(true);
    } finally {
      setLoading(false);
    }
  }, [gameState, usage]);

  const copyReport = useCallback(() => {
    if (!report) return;
    const text = `═══ SYSOP BATTLE REPORT ═══\n\n${report}\n\n— Battle AI | battleai.gg`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [report]);

  // Reset when new battle starts
  useEffect(() => {
    if (!isOver) {
      setReport(null);
      setVisible(false);
    }
  }, [isOver]);

  if (!isOver || !report) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="w-full max-w-lg"
        >
          <div className="bg-bg-panel border border-cyan/30 rounded-sm overflow-hidden">
            {/* Header */}
            <div className="bg-bg-elevated border-b border-cyan/20 px-3 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-cyan text-[10px] font-mono animate-flicker">&gt;_</span>
                <span className="text-cyan text-[10px] font-mono uppercase tracking-widest">SYSOP Report</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyReport}
                  className="text-[9px] font-mono text-text-dim hover:text-cyan transition-colors"
                >
                  {copied ? "COPIED" : "SHARE"}
                </button>
                <button
                  onClick={() => setVisible(false)}
                  className="text-[9px] font-mono text-text-dim hover:text-magenta transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </div>

            {/* Report body */}
            <div className="p-3">
              <p className="text-text-primary text-[11px] font-mono leading-relaxed whitespace-pre-wrap">
                {report}
              </p>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-3 py-1 flex justify-between">
              <span className="text-text-dim text-[8px] font-mono">SYSOP v∞ — THE MATRIX REMEMBERS ALL</span>
              <span className="text-text-dim text-[8px] font-mono">
                {gameState?.winner === "red" ? "ICE CRACKED" : gameState?.winner === "blue" ? "FLATLINED" : "MUTUAL DESTRUCTION"}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

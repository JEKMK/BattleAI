"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Faction } from "@/lib/types";
import { FACTION_META } from "@/lib/types";

interface FactionStats {
  faction: string;
  wins: number;
  losses: number;
  totalScore: number;
  runners: number;
  winRate: number;
}

interface ZaibatsuWarProps {
  playerFaction: Faction;
}

const FACTION_ORDER: Faction[] = ["anthropic", "google", "openai"];

export function ZaibatsuWar({ playerFaction }: ZaibatsuWarProps) {
  const [factions, setFactions] = useState<FactionStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/zaibatsu")
      .then((r) => r.json())
      .then((data) => {
        // Ensure all 3 factions are present
        const map = new Map(data.factions?.map((f: FactionStats) => [f.faction, f]) ?? []);
        const all = FACTION_ORDER.map((f) => (map.get(f) as FactionStats) ?? {
          faction: f, wins: 0, losses: 0, totalScore: 0, runners: 0, winRate: 0,
        });
        setFactions(all.sort((a, b) => b.totalScore - a.totalScore));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxScore = Math.max(...factions.map((f) => f.totalScore), 1);

  return (
    <div className="p-3 border-b border-border">
      <label className="text-text-secondary text-xs font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <span className="text-amber">◈</span> Zaibatsu War
        <span
          className="text-text-dim text-xs border border-text-dim/30 rounded-full w-3 h-3 flex items-center justify-center cursor-help hover:text-cyan hover:border-cyan/50 transition-colors"
          title="Global faction war across all runners. Which corporation's constructs dominate the matrix?"
        >
          ?
        </span>
      </label>

      {loading ? (
        <p className="text-text-dim text-xs font-mono cursor-blink">SCANNING MATRIX...</p>
      ) : factions.every((f) => f.totalScore === 0) ? (
        <p className="text-text-dim text-xs font-mono">No battles yet. Jack in to begin the war.</p>
      ) : (
        <div className="space-y-2">
          {factions.map((stat, i) => {
            const meta = FACTION_META[stat.faction as Faction];
            if (!meta) return null;
            const isPlayerFaction = stat.faction === playerFaction;
            const barPercent = (stat.totalScore / maxScore) * 100;
            const totalBattles = stat.wins + stat.losses;

            return (
              <div key={stat.faction}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-dim text-xs font-mono tabular-nums">
                      #{i + 1}
                    </span>
                    <span className="text-xs font-mono font-bold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    {isPlayerFaction && (
                      <span className="text-xs font-mono animate-pulse-glow" style={{ color: meta.color }}>◈</span>
                    )}
                  </div>
                  <span className="text-text-dim text-xs font-mono tabular-nums">
                    {stat.totalScore.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-neon-green text-xs font-mono tabular-nums">{stat.wins}W</span>
                  <span className="text-magenta text-xs font-mono tabular-nums">{stat.losses}L</span>
                  {totalBattles > 0 && (
                    <span className="text-text-dim text-xs font-mono tabular-nums">{stat.winRate}%</span>
                  )}
                  <span className="text-text-dim text-xs font-mono tabular-nums">{stat.runners} rnrs</span>
                </div>

                <div className="h-1.5 bg-bg-deep border border-border rounded-sm overflow-hidden">
                  <motion.div
                    className="h-full rounded-sm"
                    style={{ backgroundColor: meta.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${barPercent}%` }}
                    transition={{ duration: 0.8, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-1.5 pt-1 border-t border-border">
            <span className="text-text-dim text-xs font-mono">Your zaibatsu:</span>
            <span className="text-xs font-mono font-bold" style={{ color: FACTION_META[playerFaction].color }}>
              {FACTION_META[playerFaction].label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

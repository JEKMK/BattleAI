"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FACTION_META } from "@/lib/types";
import type { PvpTarget } from "@/lib/pvp";

interface PvpTargetsProps {
  runnerToken: string;
  onHack: (target: PvpTarget) => void;
  disabled?: boolean;
  streetCred: number;
}

export function PvpTargets({ runnerToken, onHack, disabled, streetCred }: PvpTargetsProps) {
  const [targets, setTargets] = useState<PvpTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastReroll, setLastReroll] = useState(0);

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pvp/targets", {
        headers: { "x-runner-token": runnerToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load targets");
      setTargets(data.targets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load targets");
    } finally {
      setLoading(false);
    }
  }, [runnerToken]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const handleReroll = useCallback(() => {
    const now = Date.now();
    if (now - lastReroll < 5 * 60 * 1000 && lastReroll > 0) return; // 5 min cooldown
    setLastReroll(now);
    fetchTargets();
  }, [lastReroll, fetchTargets]);

  const cooldownRemaining = Math.max(0, 5 * 60 * 1000 - (Date.now() - lastReroll));
  const canReroll = lastReroll === 0 || cooldownRemaining <= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-magenta text-xs font-mono uppercase tracking-widest">Node Scanner</span>
          <span className="text-text-dim text-xs font-mono tabular-nums">CRED: <span className="text-amber font-bold">{streetCred}</span></span>
        </div>
        <button
          onClick={handleReroll}
          disabled={!canReroll || loading}
          className={`text-xs font-mono px-2 py-0.5 rounded-sm border transition-all ${
            canReroll ? "border-cyan/30 text-cyan hover:bg-cyan/10" : "border-border text-text-dim cursor-not-allowed"
          }`}
        >
          {loading ? "SCANNING..." : canReroll ? "RESCAN" : `WAIT ${Math.ceil(cooldownRemaining / 60000)}m`}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-sm border border-border bg-bg-deep animate-pulse" />
            ))}
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-magenta text-xs font-mono text-center py-4"
          >
            {error}
          </motion.div>
        ) : targets.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-text-dim text-xs font-mono text-center py-6"
          >
            No nodes found in range. Try again later.
          </motion.div>
        ) : (
          <motion.div
            key="targets"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1.5"
          >
            {targets.map((target, i) => {
              const factionMeta = FACTION_META[target.faction as keyof typeof FACTION_META];
              const credDiff = target.streetCred - streetCred;
              const diffIndicator = credDiff > 100 ? "↑↑↑" : credDiff > 50 ? "↑↑" : credDiff > 0 ? "↑" : credDiff < -100 ? "↓↓↓" : credDiff < -50 ? "↓↓" : credDiff < 0 ? "↓" : "=";

              return (
                <motion.div
                  key={target.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-sm border bg-bg-deep overflow-hidden"
                  style={{ borderColor: factionMeta?.color ? `${factionMeta.color}33` : "var(--border)" }}
                >
                  {/* Faction color stripe */}
                  <div className="flex">
                    <div className="w-1 shrink-0" style={{ backgroundColor: factionMeta?.color || "#666" }} />
                    <div className="flex-1 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-text-primary">{target.name}</span>
                          <span className="text-xs font-mono" style={{ color: factionMeta?.color }}>{factionMeta?.label || target.faction}</span>
                        </div>
                        <span className="text-text-dim text-xs font-mono">{diffIndicator}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-amber text-xs font-mono tabular-nums">Cred: {target.streetCred}</span>
                        <span className="text-text-dim text-xs font-mono tabular-nums">{target.pvpWins}W {target.pvpLosses}L</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono">
                          <span className="text-neon-green">Win: +{target.potentialCredGain}</span>
                          <span className="text-text-dim mx-1">|</span>
                          <span className="text-magenta">Lose: {target.potentialCredLoss}</span>
                        </div>
                        <motion.button
                          onClick={() => onHack(target)}
                          disabled={disabled}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="text-xs font-mono font-bold px-3 py-1 rounded-sm border-2 border-magenta text-magenta bg-magenta/10 hover:bg-magenta/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ boxShadow: "var(--glow-magenta)" }}
                        >
                          HACK NODE
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

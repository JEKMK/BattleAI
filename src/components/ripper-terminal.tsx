"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IMPLANTS, STIMS, buildCombatEffects, BASE_EFFECTS, type ImplantDef, type StimDef } from "@/lib/implants";

interface Loadout {
  credits: number;
  implants: { implantId: string; slotType: string }[];
  stims: { stimId: string }[];
}

interface RipperTerminalProps {
  onClose: () => void;
  runnerToken: string | null;
  onLoadoutChange?: (loadout: Loadout) => void;
}

export function RipperTerminal({ onClose, runnerToken, onLoadoutChange }: RipperTerminalProps) {
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [sysopMsg, setSysopMsg] = useState<string | null>(null);

  const fetchLoadout = useCallback(async () => {
    if (!runnerToken) return;
    try {
      const res = await fetch("/api/ripper/loadout", {
        headers: { "x-runner-token": runnerToken },
      });
      const data = await res.json();
      if (res.ok) setLoadout(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [runnerToken]);

  useEffect(() => { fetchLoadout(); }, [fetchLoadout]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const buy = useCallback(async (itemId: string, type: "implant" | "stim") => {
    if (!runnerToken || buying) return;
    setBuying(itemId);
    setSysopMsg(null);
    try {
      const res = await fetch("/api/ripper/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-runner-token": runnerToken },
        body: JSON.stringify({ itemId, type }),
      });
      const data = await res.json();
      if (res.ok) {
        setSysopMsg(data.message);
        await fetchLoadout();
        if (loadout) onLoadoutChange?.({ ...loadout, credits: data.credits });
      } else {
        setSysopMsg(data.error || "Transaction failed.");
      }
    } catch {
      setSysopMsg("Connection lost. Try again.");
    } finally {
      setBuying(null);
    }
  }, [runnerToken, buying, fetchLoadout, loadout, onLoadoutChange]);

  const equippedIds = new Set(loadout?.implants.map((i) => i.implantId) ?? []);
  const activeStimIds = new Set(loadout?.stims.map((s) => s.stimId) ?? []);
  const implantIds = loadout?.implants.map((i) => i.implantId) ?? [];
  const stimIds = loadout?.stims.map((s) => s.stimId) ?? [];
  const effects = buildCombatEffects(implantIds, stimIds);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 25 }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-bg-deep border border-magenta/30 rounded-sm overflow-hidden relative crt-terminal flex flex-col"
            style={{ boxShadow: "0 0 40px rgba(255,45,106,0.1), inset 0 0 60px rgba(0,0,0,0.5)" }}>

            {/* Scanlines */}
            <div className="absolute inset-0 pointer-events-none z-10" style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,45,106,0.01) 2px, rgba(255,45,106,0.01) 4px)",
            }} />

            {/* Header */}
            <div className="border-b border-magenta/20 px-4 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-magenta text-xs font-mono">⚕</span>
                <span className="text-magenta text-xs font-mono tracking-widest">RIPPERDOC TERMINAL</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-amber font-mono text-xs font-bold">¤ {loadout?.credits ?? 0}</span>
                <button onClick={onClose} className="text-xs font-mono text-text-dim hover:text-magenta transition-colors">ESC</button>
              </div>
            </div>

            {/* SYSOP message */}
            {sysopMsg && (
              <div className="border-b border-neon-green/10 px-4 py-2 bg-neon-green/5 shrink-0">
                <span className="text-neon-green/40 text-xs font-mono">SYSOP&gt; </span>
                <span className="text-neon-green text-xs font-mono">{sysopMsg}</span>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col sm:flex-row gap-4">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-magenta/50 font-mono text-sm cursor-blink">SCANNING WETWARE...</span>
                </div>
              ) : (
                <>
                  {/* Left: YOUR DECK */}
                  <div className="sm:w-1/2">
                    <div className="text-text-secondary text-xs font-mono uppercase tracking-widest mb-3">Your Deck</div>

                    {/* Neural slot */}
                    <div className="mb-3">
                      <div className="text-text-dim text-xs font-mono mb-1">🧠 NEURAL</div>
                      {loadout?.implants.filter((i) => i.slotType === "neural").map((i) => {
                        const def = IMPLANTS[i.implantId];
                        return def ? (
                          <div key={i.implantId} className="bg-bg-surface border border-cyan/20 rounded-sm p-2 mb-1">
                            <span className="text-cyan text-xs font-mono font-bold">{def.icon} {def.name}</span>
                            <div className="text-text-dim text-xs font-mono">{def.description}</div>
                          </div>
                        ) : null;
                      })}
                      {!loadout?.implants.some((i) => i.slotType === "neural") && (
                        <div className="border border-dashed border-border rounded-sm p-2 text-text-dim text-xs font-mono">[empty slot]</div>
                      )}
                    </div>

                    {/* Cyberware slot */}
                    <div className="mb-3">
                      <div className="text-text-dim text-xs font-mono mb-1">🦾 CYBERWARE</div>
                      {loadout?.implants.filter((i) => i.slotType === "cyberware").map((i) => {
                        const def = IMPLANTS[i.implantId];
                        return def ? (
                          <div key={i.implantId} className="bg-bg-surface border border-cyan/20 rounded-sm p-2 mb-1">
                            <span className="text-cyan text-xs font-mono font-bold">{def.icon} {def.name}</span>
                            <div className="text-text-dim text-xs font-mono">{def.description}</div>
                          </div>
                        ) : null;
                      })}
                      {!loadout?.implants.some((i) => i.slotType === "cyberware") && (
                        <div className="border border-dashed border-border rounded-sm p-2 text-text-dim text-xs font-mono">[empty slot]</div>
                      )}
                    </div>

                    {/* Active stims */}
                    <div className="mb-3">
                      <div className="text-text-dim text-xs font-mono mb-1">💊 STIMS (1 battle)</div>
                      {loadout?.stims.map((s) => {
                        const def = STIMS[s.stimId];
                        return def ? (
                          <div key={s.stimId} className="bg-bg-surface border border-amber/20 rounded-sm p-2 mb-1">
                            <span className="text-amber text-xs font-mono font-bold">{def.icon} {def.name}</span>
                            <div className="text-text-dim text-xs font-mono">{def.description}</div>
                          </div>
                        ) : null;
                      })}
                      {(!loadout?.stims || loadout.stims.length === 0) && (
                        <div className="border border-dashed border-border rounded-sm p-2 text-text-dim text-xs font-mono">[none loaded]</div>
                      )}
                    </div>

                    {/* Modified stats */}
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="text-text-dim text-xs font-mono mb-1">ACTIVE MODS</div>
                      <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                        <span className="text-text-dim">Punch:</span>
                        <span className={effects.punchDmg > BASE_EFFECTS.punchDmg ? "text-neon-green" : "text-text-secondary"}>
                          {effects.punchDmg + effects.allDmgBonus} DMG
                        </span>
                        <span className="text-text-dim">Shoot:</span>
                        <span className={effects.shootDmg + effects.allDmgBonus > BASE_EFFECTS.shootDmg ? "text-neon-green" : "text-text-secondary"}>
                          {effects.shootDmg + effects.allDmgBonus} DMG {effects.shootAccuracyBonus > 0 ? `+${effects.shootAccuracyBonus}%` : ""}
                        </span>
                        <span className="text-text-dim">Heavy:</span>
                        <span className={effects.heavyDmg + effects.allDmgBonus > BASE_EFFECTS.heavyDmg ? "text-neon-green" : "text-text-secondary"}>
                          {effects.heavyDmg + effects.allDmgBonus} DMG
                        </span>
                        <span className="text-text-dim">HP:</span>
                        <span className={effects.maxHpBonus > 0 ? "text-neon-green" : "text-text-secondary"}>
                          {10 + effects.maxHpBonus}
                        </span>
                        <span className="text-text-dim">Dodge cd:</span>
                        <span className="text-text-secondary">{effects.dodgeCooldown}</span>
                        <span className="text-text-dim">RAM bonus:</span>
                        <span className={effects.ramBonus > 0 ? "text-neon-green" : "text-text-secondary"}>
                          +{effects.ramBonus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: RIPPER'S STOCK */}
                  <div className="sm:w-1/2">
                    <div className="text-text-secondary text-xs font-mono uppercase tracking-widest mb-3">Ripper&apos;s Stock</div>

                    {/* Implants */}
                    {Object.values(IMPLANTS).map((item) => (
                      <ItemCard key={item.id} item={item} type="implant"
                        owned={equippedIds.has(item.id)}
                        canAfford={(loadout?.credits ?? 0) >= item.cost}
                        buying={buying === item.id}
                        onBuy={() => buy(item.id, "implant")} />
                    ))}

                    <div className="h-2" />

                    {/* Stims */}
                    {Object.values(STIMS).map((item) => (
                      <ItemCard key={item.id} item={item} type="stim"
                        owned={activeStimIds.has(item.id)}
                        canAfford={(loadout?.credits ?? 0) >= item.cost}
                        buying={buying === item.id}
                        onBuy={() => buy(item.id, "stim")} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between shrink-0">
              <button onClick={onClose} className="text-xs font-mono text-magenta/40 hover:text-magenta transition-colors">
                &gt; CLOSE TERMINAL
              </button>
              <span className="text-xs font-mono text-text-dim">ESC TO CLOSE</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ItemCard({ item, type, owned, canAfford, buying, onBuy }: {
  item: ImplantDef | StimDef;
  type: "implant" | "stim";
  owned: boolean;
  canAfford: boolean;
  buying: boolean;
  onBuy: () => void;
}) {
  const slot = type === "implant" ? (item as ImplantDef).slot.toUpperCase() : "STIM";

  return (
    <div className={`border rounded-sm p-2 mb-1.5 transition-all ${
      owned ? "border-cyan/30 bg-cyan/5" : "border-border hover:border-border-bright"
    }`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-mono font-bold" style={{ color: owned ? "#00f0ff" : type === "stim" ? "#ffb800" : "#b44aff" }}>
          {item.icon} {item.name}
        </span>
        <span className="text-xs font-mono text-text-dim">{slot}</span>
      </div>
      <div className="text-text-dim text-xs font-mono mb-1">{item.description}</div>
      <div className="flex items-center justify-between">
        <span className="text-amber text-xs font-mono font-bold">¤ {item.cost}</span>
        {owned ? (
          <span className="text-cyan text-xs font-mono">EQUIPPED</span>
        ) : (
          <button
            onClick={onBuy}
            disabled={!canAfford || buying}
            className={`text-xs font-mono px-2 py-0.5 rounded-sm border transition-all ${
              canAfford && !buying
                ? "border-magenta text-magenta hover:bg-magenta/10"
                : "border-border text-text-dim cursor-not-allowed"
            }`}
          >
            {buying ? "..." : "BUY"}
          </button>
        )}
      </div>
    </div>
  );
}

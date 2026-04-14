"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IMPLANTS, STIMS, CONTEXT_LEVELS, buildCombatEffects, BASE_EFFECTS, type ImplantDef, type StimDef } from "@/lib/implants";

interface Loadout {
  credits: number;
  contextLevel: number;
  implants: { implantId: string; slotType: string }[];
  stims: { stimId: string }[];
}

interface RipperTerminalProps {
  onClose: () => void;
  runnerToken: string | null;
  onLoadoutChange?: (loadout: Loadout) => void;
}

type SortMode = "price-asc" | "price-desc" | "name";
type FilterMode = "all" | "neural" | "cyberware" | "stim" | "os";

export function RipperTerminal({ onClose, runnerToken, onLoadoutChange }: RipperTerminalProps) {
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [sysopMsg, setSysopMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("price-asc");

  const fetchLoadout = useCallback(async () => {
    if (!runnerToken) return;
    try {
      const res = await fetch("/api/ripper/loadout", { headers: { "x-runner-token": runnerToken } });
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

  const buy = useCallback(async (itemId: string, type: "implant" | "stim" | "os") => {
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
        if (loadout) onLoadoutChange?.({ ...loadout, credits: data.credits, contextLevel: data.contextLevel ?? loadout.contextLevel });
      } else {
        setSysopMsg(data.error || "Transaction failed.");
      }
    } catch { setSysopMsg("Connection lost."); }
    finally { setBuying(null); }
  }, [runnerToken, buying, fetchLoadout, loadout, onLoadoutChange]);

  const equippedIds = new Set(loadout?.implants.map((i) => i.implantId) ?? []);
  const activeStimIds = new Set(loadout?.stims.map((s) => s.stimId) ?? []);
  const implantIds = loadout?.implants.map((i) => i.implantId) ?? [];
  const stimIds = loadout?.stims.map((s) => s.stimId) ?? [];
  const effects = buildCombatEffects(implantIds, stimIds);

  // Build filtered + sorted item list
  const allItems: { item: ImplantDef | StimDef; type: "implant" | "stim" }[] = [];
  if (filter === "all" || filter === "neural") {
    Object.values(IMPLANTS).filter((i) => i.slot === "neural").forEach((item) => allItems.push({ item, type: "implant" }));
  }
  if (filter === "all" || filter === "cyberware") {
    Object.values(IMPLANTS).filter((i) => i.slot === "cyberware").forEach((item) => allItems.push({ item, type: "implant" }));
  }
  if (filter === "all" || filter === "stim") {
    Object.values(STIMS).forEach((item) => allItems.push({ item, type: "stim" }));
  }
  // OS context levels — render as special cards
  const showOs = filter === "all" || filter === "os";

  allItems.sort((a, b) => {
    if (sort === "price-asc") return a.item.cost - b.item.cost;
    if (sort === "price-desc") return b.item.cost - a.item.cost;
    return a.item.name.localeCompare(b.item.name);
  });

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
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col"
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
              <div className="border-b border-neon-green/10 px-4 py-1.5 bg-neon-green/5 shrink-0">
                <span className="text-neon-green/40 text-xs font-mono">SYSOP&gt; </span>
                <span className="text-neon-green text-xs font-mono">{sysopMsg}</span>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-magenta/50 font-mono text-sm cursor-blink">SCANNING WETWARE...</span>
                </div>
              ) : (
                <>
                  {/* Left: YOUR DECK (compact) */}
                  <div className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-border p-3 overflow-y-auto">
                    <div className="text-text-secondary text-xs font-mono uppercase tracking-widest mb-2">Your Deck</div>

                    {/* Equipped slots */}
                    {(["neural", "cyberware"] as const).map((slot) => {
                      const equipped = loadout?.implants.find((i) => i.slotType === slot);
                      const def = equipped ? IMPLANTS[equipped.implantId] : null;
                      return (
                        <div key={slot} className="mb-2">
                          <div className="text-text-dim text-xs font-mono mb-0.5">{slot === "neural" ? "🧠" : "🦾"} {slot.toUpperCase()}</div>
                          {def ? (
                            <div className="bg-bg-surface border border-cyan/20 rounded-sm px-2 py-1">
                              <span className="text-cyan text-xs font-mono font-bold">{def.icon} {def.name}</span>
                            </div>
                          ) : (
                            <div className="border border-dashed border-border rounded-sm px-2 py-1 text-text-dim text-xs font-mono">[empty]</div>
                          )}
                        </div>
                      );
                    })}

                    {/* Stims */}
                    <div className="mb-2">
                      <div className="text-text-dim text-xs font-mono mb-0.5">💊 STIMS</div>
                      {loadout?.stims.length ? loadout.stims.map((s) => {
                        const def = STIMS[s.stimId];
                        return def ? (
                          <div key={s.stimId} className="bg-bg-surface border border-amber/20 rounded-sm px-2 py-1 mb-0.5">
                            <span className="text-amber text-xs font-mono">{def.icon} {def.name}</span>
                          </div>
                        ) : null;
                      }) : (
                        <div className="border border-dashed border-border rounded-sm px-2 py-1 text-text-dim text-xs font-mono">[none]</div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="border-t border-border pt-2 mt-1">
                      <div className="text-text-dim text-xs font-mono mb-1">MODS</div>
                      <div className="space-y-0.5 text-xs font-mono">
                        {[
                          ["Punch", `${effects.punchDmg + effects.allDmgBonus} DMG / rng ${2 + effects.punchRange}`, effects.punchDmg > BASE_EFFECTS.punchDmg || effects.allDmgBonus > 0 || effects.punchRange > 0],
                          ["Shoot", `${effects.shootDmg + effects.allDmgBonus} DMG${effects.shootAccuracyBonus > 0 ? ` +${effects.shootAccuracyBonus}%` : ""}`, effects.shootDmg > BASE_EFFECTS.shootDmg || effects.allDmgBonus > 0 || effects.shootAccuracyBonus > 0],
                          ["Heavy", `${effects.heavyDmg + effects.allDmgBonus} DMG / cd ${effects.heavyCooldown}`, effects.heavyDmg > BASE_EFFECTS.heavyDmg || effects.allDmgBonus > 0 || effects.heavyCooldown < BASE_EFFECTS.heavyCooldown],
                          ["HP", `${10 + effects.maxHpBonus}`, effects.maxHpBonus !== 0],
                          ["Dodge", `cd ${effects.dodgeCooldown}`, effects.dodgeCooldown !== BASE_EFFECTS.dodgeCooldown],
                          ["Parry", `cd ${effects.parryCooldown}`, effects.parryCooldown !== BASE_EFFECTS.parryCooldown],
                          ["RAM", `+${effects.ramBonus}`, effects.ramBonus !== 0],
                        ].map(([label, val, modified]) => (
                          <div key={label as string} className="flex justify-between">
                            <span className="text-text-dim">{label as string}</span>
                            <span className={modified ? "text-neon-green" : "text-text-secondary"}>{val as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: STORE (grid) */}
                  <div className="flex-1 flex flex-col overflow-hidden p-3">
                    {/* Controls */}
                    <div className="flex items-center justify-between mb-2 shrink-0 gap-2 flex-wrap">
                      <div className="flex gap-1">
                        {([["all", "ALL"], ["neural", "🧠"], ["cyberware", "🦾"], ["stim", "💊"], ["os", "💻 OS"]] as const).map(([key, label]) => (
                          <button key={key} onClick={() => setFilter(key)}
                            className={`text-xs font-mono px-2 py-0.5 rounded-sm border transition-all ${
                              filter === key ? "border-magenta text-magenta bg-magenta/10" : "border-border text-text-dim hover:text-text-secondary"
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setSort("price-asc")}
                          className={`text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all ${sort === "price-asc" ? "border-amber text-amber" : "border-border text-text-dim"}`}>
                          ¤↑
                        </button>
                        <button onClick={() => setSort("price-desc")}
                          className={`text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all ${sort === "price-desc" ? "border-amber text-amber" : "border-border text-text-dim"}`}>
                          ¤↓
                        </button>
                        <button onClick={() => setSort("name")}
                          className={`text-xs font-mono px-1.5 py-0.5 rounded-sm border transition-all ${sort === "name" ? "border-cyan text-cyan" : "border-border text-text-dim"}`}>
                          A-Z
                        </button>
                      </div>
                    </div>

                    {/* Items grid */}
                    <div className="flex-1 overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                        {allItems.map(({ item, type }) => {
                          const owned = type === "implant" ? equippedIds.has(item.id) : activeStimIds.has(item.id);
                          const canAfford = (loadout?.credits ?? 0) >= item.cost;
                          const slot = type === "implant" ? (item as ImplantDef).slot : "stim";
                          const slotColor = slot === "neural" ? "#b44aff" : slot === "cyberware" ? "#00f0ff" : "#ffb800";

                          return (
                            <div key={item.id}
                              className={`group border rounded-sm p-2 transition-all cursor-default ${
                                owned ? "border-cyan/30 bg-cyan/5" : "border-border hover:border-border-bright"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-mono font-bold truncate" style={{ color: owned ? "#00f0ff" : slotColor }}>
                                  {item.icon} {item.name}
                                </span>
                                <span title={item.lore}
                                  className="text-text-dim text-xs border border-text-dim/30 rounded-full w-3.5 h-3.5 flex items-center justify-center cursor-help hover:text-cyan hover:border-cyan/50 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-1">
                                  ?
                                </span>
                              </div>
                              <div className="text-text-secondary text-xs font-mono mb-1 truncate">{item.description}</div>
                              <div className="flex items-center justify-between">
                                <span className="text-amber text-xs font-mono font-bold">¤{item.cost}</span>
                                {owned ? (
                                  <span className="text-cyan text-xs font-mono">ON</span>
                                ) : (
                                  <button onClick={() => buy(item.id, type)} disabled={!canAfford || buying === item.id}
                                    className={`text-xs font-mono px-2 py-0.5 rounded-sm border transition-all ${
                                      canAfford && buying !== item.id
                                        ? "border-magenta text-magenta hover:bg-magenta/10"
                                        : "border-border text-text-dim cursor-not-allowed"
                                    }`}>
                                    {buying === item.id ? "..." : "BUY"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* OS Context Memory levels */}
                        {showOs && CONTEXT_LEVELS.filter((l) => l.level > 0).map((level) => {
                          const isCurrent = level.level === (loadout?.contextLevel ?? 0);
                          const isLower = level.level < (loadout?.contextLevel ?? 0);
                          const canAfford = (loadout?.credits ?? 0) >= level.cost;
                          return (
                            <div key={level.id}
                              className={`group border rounded-sm p-2 transition-all cursor-default ${
                                isCurrent ? "border-neon-green/30 bg-neon-green/5" : isLower ? "border-border opacity-40" : "border-border hover:border-border-bright"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-mono font-bold truncate" style={{ color: isCurrent ? "#39ff14" : "#00f0ff" }}>
                                  💻 {level.name}
                                </span>
                                <span title={level.lore}
                                  className="text-text-dim text-xs border border-text-dim/30 rounded-full w-3.5 h-3.5 flex items-center justify-center cursor-help hover:text-cyan hover:border-cyan/50 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-1">
                                  ?
                                </span>
                              </div>
                              <div className="text-text-secondary text-xs font-mono mb-1">{level.description}</div>
                              <div className="flex items-center justify-between">
                                <span className="text-amber text-xs font-mono font-bold">¤{level.cost}</span>
                                {isCurrent ? (
                                  <span className="text-neon-green text-xs font-mono">CURRENT</span>
                                ) : isLower ? (
                                  <span className="text-text-dim text-xs font-mono">OWNED</span>
                                ) : (
                                  <button onClick={() => buy(level.id, "os")} disabled={!canAfford || buying === level.id}
                                    className={`text-xs font-mono px-2 py-0.5 rounded-sm border transition-all ${
                                      canAfford && buying !== level.id
                                        ? "border-neon-green text-neon-green hover:bg-neon-green/10"
                                        : "border-border text-text-dim cursor-not-allowed"
                                    }`}>
                                    {buying === level.id ? "..." : "UPGRADE"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/50 px-4 py-1.5 flex items-center justify-between shrink-0">
              <button onClick={onClose} className="text-xs font-mono text-magenta/40 hover:text-magenta transition-colors">
                &gt; CLOSE
              </button>
              <span className="text-xs font-mono text-text-dim">{allItems.length} items</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

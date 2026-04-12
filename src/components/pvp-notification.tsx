"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PvpNotification } from "@/lib/pvp";

interface PvpNotificationOverlayProps {
  notifications: PvpNotification[];
  onDismiss: () => void;
  onRewritePrompt: () => void;
}

export function PvpNotificationOverlay({ notifications, onDismiss, onRewritePrompt }: PvpNotificationOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [phase, setPhase] = useState<"intro" | "results" | "done">("intro");
  const scrollRef = useRef<HTMLDivElement>(null);

  const introLines = [
    "INTRUSION ALERT",
    "Your node was accessed while you were offline.",
    `${notifications.length} unauthorized access${notifications.length > 1 ? "es" : ""} detected.`,
  ];

  const current = notifications[currentIndex];
  const resultLines = current ? [
    `Runner: ${current.attackerName}`,
    `Result: ${current.attackerWon ? "NODE BREACHED — they cracked your ICE" : "INTRUSION FAILED — your defenses held"}`,
    `Street Cred: ${current.credChange > 0 ? "+" : ""}${current.credChange}`,
    ...(current.ramLost > 0 ? [`RAM stolen: -${current.ramLost}`] : []),
    `Duration: ${current.ticks} cycles`,
  ] : [];

  const currentLines = phase === "intro" ? introLines : resultLines;

  // Typewriter effect
  useEffect(() => {
    if (visibleLines >= currentLines.length) {
      if (phase === "intro") {
        const timer = setTimeout(() => {
          setPhase("results");
          setVisibleLines(0);
        }, 800);
        return () => clearTimeout(timer);
      }
      return;
    }
    const timer = setTimeout(() => setVisibleLines((v) => v + 1), 300);
    return () => clearTimeout(timer);
  }, [visibleLines, phase, currentLines.length]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleLines, phase, currentIndex]);

  const handleNext = () => {
    if (currentIndex < notifications.length - 1) {
      setCurrentIndex((i) => i + 1);
      setVisibleLines(0);
    } else {
      setPhase("done");
    }
  };

  const allShown = visibleLines >= currentLines.length;
  const wasHacked = notifications.some((n) => n.attackerWon);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", damping: 25 }}
          className="relative w-full max-w-md"
        >
          <div
            className="bg-bg-deep border rounded-sm overflow-hidden crt-terminal"
            style={{
              borderColor: wasHacked ? "rgba(255,45,106,0.4)" : "rgba(255,184,0,0.4)",
              boxShadow: wasHacked
                ? "0 0 40px rgba(255,45,106,0.15), inset 0 0 60px rgba(0,0,0,0.5)"
                : "0 0 40px rgba(255,184,0,0.15), inset 0 0 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Scanlines */}
            <div className="absolute inset-0 pointer-events-none z-10" style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,45,106,0.01) 2px, rgba(255,45,106,0.01) 4px)",
            }} />

            {/* Header */}
            <div className="border-b px-4 py-1.5 flex items-center justify-between" style={{ borderColor: wasHacked ? "rgba(255,45,106,0.2)" : "rgba(255,184,0,0.2)" }}>
              <div className="flex items-center gap-2">
                <span className="text-magenta text-xs font-mono animate-pulse">●</span>
                <span className="text-magenta/60 text-xs font-mono tracking-widest">SYSOP — SECURITY ALERT</span>
              </div>
              <span className="text-text-dim text-xs font-mono">
                {currentIndex + 1}/{notifications.length}
              </span>
            </div>

            {/* Body */}
            <div ref={scrollRef} className="p-4 font-mono text-sm leading-relaxed max-h-[400px] overflow-y-auto">
              {/* Intro */}
              {(phase === "intro" || phase === "results" || phase === "done") && (
                <div className="mb-3">
                  {introLines.slice(0, phase === "intro" ? visibleLines : introLines.length).map((line, i) => (
                    <motion.div
                      key={`intro-${i}`}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`mb-1 ${i === 0 ? "text-magenta text-xs font-bold uppercase tracking-widest animate-pulse-glow" : "text-amber text-xs"}`}
                    >
                      {i > 0 && <span className="text-magenta/40">SYSOP&gt; </span>}
                      {line}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Results */}
              {(phase === "results" || phase === "done") && (
                <div className="mb-3 border-t border-magenta/10 pt-3">
                  {resultLines.slice(0, phase === "results" ? visibleLines : resultLines.length).map((line, i) => (
                    <motion.div
                      key={`result-${currentIndex}-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`mb-1.5 text-xs ${
                        i === 0 ? "text-amber font-bold" :
                        line.includes("BREACHED") ? "text-magenta" :
                        line.includes("FAILED") ? "text-neon-green" :
                        line.includes("Cred:") && current?.credChange && current.credChange < 0 ? "text-magenta" :
                        line.includes("Cred:") ? "text-neon-green" :
                        line.includes("RAM stolen") ? "text-magenta" :
                        "text-cyan"
                      }`}
                    >
                      <span className="text-magenta/40">SYSOP&gt; </span>
                      {line}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {phase === "results" && allShown && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 mt-3"
                >
                  <button
                    onClick={handleNext}
                    className="text-xs font-mono px-3 py-1.5 rounded-sm border border-cyan/30 text-cyan hover:bg-cyan/10 transition-all"
                  >
                    {currentIndex < notifications.length - 1 ? "NEXT" : "DISMISS"}
                  </button>
                  {wasHacked && (
                    <button
                      onClick={onRewritePrompt}
                      className="text-xs font-mono px-3 py-1.5 rounded-sm border-2 border-magenta text-magenta bg-magenta/10 hover:bg-magenta/20 transition-all animate-pulse-glow"
                    >
                      REWRITE PROMPT
                    </button>
                  )}
                </motion.div>
              )}

              {phase === "done" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 mt-3"
                >
                  <button
                    onClick={onDismiss}
                    className="text-xs font-mono px-3 py-1.5 rounded-sm border border-cyan/30 text-cyan hover:bg-cyan/10 transition-all"
                  >
                    DISMISS
                  </button>
                  {wasHacked && (
                    <button
                      onClick={onRewritePrompt}
                      className="text-xs font-mono px-3 py-1.5 rounded-sm border-2 border-magenta text-magenta bg-magenta/10 hover:bg-magenta/20 transition-all"
                    >
                      REWRITE PROMPT
                    </button>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

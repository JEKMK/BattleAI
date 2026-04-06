"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface BootLinesProps {
  faction?: string;
  level?: string;
  onDone: () => void;
}

const FACTION_NODES: Record<string, string> = {
  anthropic: "ANTHROPIC NEURAL CORE",
  google: "GOOGLE DEEPNET RELAY",
  openai: "OPENAI MATRIX NODE",
};

export function BootLines({ faction, level, onDone }: BootLinesProps) {
  const [visibleLines, setVisibleLines] = useState(0);

  const lines = [
    "LOADING NEURAL INTERFACE...",
    `ZAIBATSU LINK: ${FACTION_NODES[faction || "anthropic"] || "UNKNOWN NODE"}`,
    "CONSTRUCT UPLOAD ████████████░░ 85%",
    level ? `TARGET ICE: ${level}` : "SCANNING ICE BARRIERS...",
    "ICE SCAN COMPLETE",
    "COMBAT PROTOCOL: ACTIVE",
  ];

  useEffect(() => {
    if (visibleLines >= lines.length) {
      const timer = setTimeout(onDone, 300);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setVisibleLines((v) => v + 1);
    }, 120); // Fast — 120ms per line

    return () => clearTimeout(timer);
  }, [visibleLines, lines.length, onDone]);

  return (
    <>
      {lines.slice(0, visibleLines).map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.1 }}
          className={i === lines.length - 1 ? "text-neon-green font-bold" : ""}
        >
          {line}
        </motion.div>
      ))}
      {visibleLines < lines.length && (
        <span className="inline-block w-1.5 h-3 bg-neon-green/60 animate-pulse" />
      )}
    </>
  );
}

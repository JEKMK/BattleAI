"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

const SYSOP_LINES = [
  { text: "ONO-SENDAI CYBERSPACE VII — NEURAL LINK ACTIVE", type: "system" as const },
  { text: "Another runner jacking in from the Sprawl.", type: "sysop" as const },
  { text: "Your construct fights alone in the matrix. What it knows, what it does — that's on you. Write its neural template. That's your only weapon.", type: "sysop" as const },
  { text: "RAM: limited. Make every word count.", type: "emphasis" as const },
  { text: "10 ICE barriers ahead. Nobody's cracked them all. Not since Screaming Fist.", type: "sysop" as const },
  { text: "The matrix is watching. Show it what you've got, console cowboy.", type: "emphasis" as const },
];

const CHAR_SPEED = 30; // ms per character — fast but visible

interface SysopTerminalProps {
  onDismiss: () => void;
}

export function SysopTerminal({ onDismiss }: SysopTerminalProps) {
  const [displayedLines, setDisplayedLines] = useState<{ text: string; type: string }[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [isDone, setIsDone] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (currentLine >= SYSOP_LINES.length) {
      setIsDone(true);
      return;
    }

    const line = SYSOP_LINES[currentLine];

    if (currentChar === 0) {
      setDisplayedLines((prev) => [...prev, { text: "", type: line.type }]);
    }

    if (currentChar < line.text.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const next = [...prev];
          next[next.length - 1] = { text: line.text.slice(0, currentChar + 1), type: line.type };
          return next;
        });
        setCurrentChar((c) => c + 1);
      }, line.type === "system" ? 10 : CHAR_SPEED);
      return () => clearTimeout(timer);
    }

    // Line done — pause then next
    const pause = line.type === "system" ? 300 : 600;
    const timer = setTimeout(() => {
      setCurrentLine((l) => l + 1);
      setCurrentChar(0);
    }, pause);
    return () => clearTimeout(timer);
  }, [currentLine, currentChar]);

  // Click to skip typewriter
  const skipToEnd = useCallback(() => {
    if (isDone) return;
    setDisplayedLines(SYSOP_LINES.map((l) => ({ text: l.text, type: l.type })));
    setCurrentLine(SYSOP_LINES.length);
    setIsDone(true);
  }, [isDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
      onClick={skipToEnd}
    >
      <div className="w-full max-w-lg px-4">
        {/* Terminal window */}
        <div className="bg-bg-deep border border-neon-green/20 rounded-sm overflow-hidden"
          style={{ boxShadow: "0 0 30px rgba(57,255,20,0.05), inset 0 0 60px rgba(0,0,0,0.5)" }}>

          {/* Scanlines overlay */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,20,0.015) 2px, rgba(57,255,20,0.015) 4px)",
          }} />

          {/* Header */}
          <div className="border-b border-neon-green/10 px-4 py-1.5 flex items-center gap-2">
            <span className="text-neon-green/60 text-[9px] font-mono">●</span>
            <span className="text-neon-green/40 text-[9px] font-mono tracking-widest">SYSOP TERMINAL</span>
          </div>

          {/* Body */}
          <div className="p-4 font-mono text-sm leading-relaxed min-h-[200px] relative">
            {displayedLines.map((line, i) => (
              <div key={i} className={`mb-2 ${
                line.type === "system" ? "text-neon-green/30 text-[10px] uppercase tracking-widest" :
                line.type === "emphasis" ? "text-neon-green" :
                "text-neon-green/70"
              }`}>
                {line.type === "sysop" && <span className="text-neon-green/40">SYSOP&gt; </span>}
                {line.text}
              </div>
            ))}

            {/* Blinking cursor */}
            {!isDone && (
              <span className="inline-block w-2 h-4 bg-neon-green/80 animate-pulse ml-0.5" />
            )}

            {/* Prompt cursor when done */}
            {isDone && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 flex items-center gap-1"
              >
                <span className="text-neon-green">&gt;</span>
                <span className="w-2 h-4 bg-neon-green/80 animate-pulse" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Below terminal — hints */}
        {isDone && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-4 flex items-center justify-between px-1"
          >
            <span className="text-text-dim text-[9px] font-mono">
              ↓ Write your neural template below. Then FIGHT.
            </span>
            <a
              href="/lore"
              onClick={(e) => e.stopPropagation()}
              className="text-[9px] font-mono text-amber/50 hover:text-amber transition-colors"
            >
              [FULL TRANSMISSION]
            </a>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

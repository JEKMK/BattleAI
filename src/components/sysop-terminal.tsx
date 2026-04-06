"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";

const SYSOP_LINES = [
  { text: "ONO-SENDAI CYBERSPACE VII — NEURAL LINK ACTIVE", type: "system" as const },
  { text: "Another runner jacking in from the Sprawl.", type: "sysop" as const },
  { text: "Your construct fights alone in the matrix. What it knows, what it does — that's on you. Write its neural template. That's your only weapon.", type: "sysop" as const },
  { text: "RAM: limited. Make every word count.", type: "emphasis" as const },
  { text: "10 ICE barriers ahead. Nobody's cracked them all. Not since Screaming Fist.", type: "sysop" as const },
];

const CHAR_SPEED = 30;

interface SysopTerminalProps {
  onDismiss: (runnerName: string) => void;
}

export function SysopTerminal({ onDismiss }: SysopTerminalProps) {
  const [phase, setPhase] = useState<"connecting" | "typing" | "name" | "ready">("connecting");
  const [displayedLines, setDisplayedLines] = useState<{ text: string; type: string }[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [runnerName, setRunnerName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Phase 1: Connecting animation
  useEffect(() => {
    if (phase !== "connecting") return;
    const timer = setTimeout(() => setPhase("typing"), 1800);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 2: Typewriter
  useEffect(() => {
    if (phase !== "typing") return;
    if (currentLine >= SYSOP_LINES.length) {
      setPhase("name");
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

    const pause = line.type === "system" ? 300 : 600;
    const timer = setTimeout(() => {
      setCurrentLine((l) => l + 1);
      setCurrentChar(0);
    }, pause);
    return () => clearTimeout(timer);
  }, [phase, currentLine, currentChar]);

  // Focus input when name phase starts
  useEffect(() => {
    if (phase === "name" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedLines, phase, nameSubmitted]);

  const skipToEnd = useCallback(() => {
    if (phase === "connecting") {
      setPhase("typing");
      return;
    }
    if (phase === "typing") {
      setDisplayedLines(SYSOP_LINES.map((l) => ({ text: l.text, type: l.type })));
      setCurrentLine(SYSOP_LINES.length);
      setPhase("name");
    }
  }, [phase]);

  const submitName = useCallback(() => {
    const name = runnerName.trim().toUpperCase() || "ANONYMOUS";
    setRunnerName(name);
    setNameSubmitted(true);
    localStorage.setItem("battleai_runner", JSON.stringify({
      name,
      createdAt: new Date().toISOString(),
    }));
    setTimeout(() => setPhase("ready"), 500);
  }, [runnerName]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="w-full h-full flex flex-col items-center justify-center"
      onClick={phase === "typing" || phase === "connecting" ? skipToEnd : undefined}
    >
      <div className="w-full max-w-lg px-4">
        <div className="bg-bg-deep border border-neon-green/20 rounded-sm overflow-hidden relative crt-terminal"
          style={{ boxShadow: "0 0 30px rgba(57,255,20,0.05), inset 0 0 60px rgba(0,0,0,0.5)" }}>

          {/* Scanlines overlay */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,20,0.015) 2px, rgba(57,255,20,0.015) 4px)",
          }} />

          {/* Header */}
          <div className="border-b border-neon-green/10 px-4 py-1.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-neon-green/60 text-[9px] font-mono">●</span>
              <span className="text-neon-green/40 text-[9px] font-mono tracking-widest">SYSOP TERMINAL</span>
            </div>
            <span className={`text-[8px] font-mono ${phase === "connecting" ? "text-amber/50 animate-pulse" : "text-neon-green/30"}`}>
              {phase === "connecting" ? "CONNECTING..." : "CONNECTED"}
            </span>
          </div>

          {/* Body — fixed height, scrollable */}
          <div ref={scrollRef} className="p-4 font-mono text-sm leading-relaxed h-[320px] overflow-y-auto relative">
            {/* Connecting animation */}
            {phase === "connecting" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full gap-3"
              >
                <div className="text-neon-green/20 text-[10px] uppercase tracking-[0.5em]">
                  ESTABLISHING NEURAL LINK
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-neon-green/40 rounded-sm"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
                <div className="text-neon-green/10 text-[8px] font-mono">
                  CHIBA CITY RELAY NODE // ENCRYPTED
                </div>
              </motion.div>
            )}

            {/* Typewriter lines */}
            {phase !== "connecting" && displayedLines.map((line, i) => {
              const isLastLine = i === displayedLines.length - 1;
              const showCursor = isLastLine && phase === "typing";
              return (
                <div key={i} className={`mb-2 ${
                  line.type === "system" ? "text-neon-green/30 text-[10px] uppercase tracking-widest" :
                  line.type === "emphasis" ? "text-neon-green" :
                  "text-neon-green/70"
                }`}>
                  {line.type === "sysop" && <span className="text-neon-green/40">SYSOP&gt; </span>}
                  {line.text}
                  {showCursor && <span className="inline-block w-2 h-4 bg-neon-green/80 animate-pulse ml-0.5 align-middle" />}
                </div>
              );
            })}

            {/* Name input */}
            {phase === "name" && !nameSubmitted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-amber mb-2">SYSOP&gt; What do they call you, runner?</div>
                <div className="flex items-center gap-2">
                  <span className="text-neon-green">&gt;</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={runnerName}
                    onChange={(e) => setRunnerName(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => e.key === "Enter" && runnerName.trim() && submitName()}
                    className="flex-1 bg-transparent border-none outline-none text-neon-green font-mono text-sm uppercase"
                    placeholder="ENTER YOUR HANDLE..."
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
                <p className="text-neon-green/20 text-[9px] mt-1.5">Press ENTER to confirm</p>
              </motion.div>
            )}

            {/* Post-name response */}
            {nameSubmitted && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-amber mb-2">SYSOP&gt; What do they call you, runner?</div>
                <div className="mt-1 mb-2">
                  <span className="text-neon-green">&gt; </span>
                  <span className="text-neon-green font-bold">{runnerName}</span>
                </div>
                <div className="text-neon-green/70 mb-1">
                  <span className="text-neon-green/40">SYSOP&gt; </span>
                  {runnerName}. The matrix will remember that name — one way or another.
                </div>
                <div className="text-neon-green">
                  Show it what you&apos;ve got, console cowboy.
                </div>
              </motion.div>
            )}

            {/* ENTER THE MATRIX button */}
            {phase === "ready" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 flex flex-col items-center gap-3"
              >
                <motion.button
                  onClick={(e) => { e.stopPropagation(); onDismiss(runnerName); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-2.5 border-2 border-neon-green text-neon-green font-mono font-bold text-sm uppercase tracking-[0.4em] rounded-sm bg-neon-green/5 hover:bg-neon-green/15 transition-all"
                  style={{ boxShadow: "0 0 20px rgba(57,255,20,0.2), 0 0 40px rgba(57,255,20,0.1)" }}
                >
                  ENTER THE MATRIX
                </motion.button>
                <a
                  href="/lore"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[9px] font-mono text-amber/40 hover:text-amber transition-colors"
                >
                  [FULL TRANSMISSION — READ THE LORE]
                </a>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";

const CHAR_SPEED = 18;

const EXPLAIN_LINES = [
  { text: "You're a runner now. You write combat orders for your AI. It reads your prompt. It fights alone. You watch.", type: "sysop" as const },
  { text: 'Like this: "Move toward enemy. Punch when close. Block if HP is low. Shoot from far."', type: "emphasis" as const },
  { text: "Think you can write something better? Or need me to help?", type: "sysop" as const },
];

const BOOT_CODE = [
  "LOADING ONO-SENDAI CYBERSPACE VII...",
  "MEM CHECK: 0x00FF → 0xFFFF [OK]",
  "NEURAL INTERFACE: ACTIVE",
  "CHIBA CITY RELAY NODE: CONNECTED",
  "ICE SCANNER: ONLINE",
  "SYSOP KERNEL: v∞.7.1",
  "COMBAT PROTOCOL: LOADED",
  "ESTABLISHING SECURE CHANNEL...",
];

const HELPED_PROMPT = "Move toward the enemy and attack when close. If HP drops below half, block and retreat. Shoot from distance.";

export interface OnboardingResult {
  mode: "write" | "helped";
  prompt?: string;
}

interface SysopTerminalProps {
  onDismiss: (result: OnboardingResult) => void;
  existingName?: string | null;
}

function useTypewriter(lines: { text: string; type: string }[], enabled: boolean) {
  const [displayed, setDisplayed] = useState<{ text: string; type: string }[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled || done) return;
    if (lineIdx >= lines.length) { setDone(true); return; }

    const line = lines[lineIdx];
    if (charIdx === 0) {
      setDisplayed((prev) => [...prev, { text: "", type: line.type }]);
    }

    if (charIdx < line.text.length) {
      const speed = line.type === "system" ? 8 : CHAR_SPEED;
      const timer = setTimeout(() => {
        setDisplayed((prev) => {
          const next = [...prev];
          next[next.length - 1] = { text: line.text.slice(0, charIdx + 1), type: line.type };
          return next;
        });
        setCharIdx((c) => c + 1);
      }, speed);
      return () => clearTimeout(timer);
    }

    const pause = line.type === "system" ? 150 : 300;
    const timer = setTimeout(() => { setLineIdx((l) => l + 1); setCharIdx(0); }, pause);
    return () => clearTimeout(timer);
  }, [enabled, done, lineIdx, charIdx, lines]);

  const skipToEnd = useCallback(() => {
    if (done) return;
    setDisplayed(lines.map((l) => ({ text: l.text, type: l.type })));
    setLineIdx(lines.length);
    setDone(true);
  }, [done, lines]);

  return { displayed, done, skipToEnd };
}

export function SysopTerminal({ onDismiss, existingName }: SysopTerminalProps) {
  const [phase, setPhase] = useState<
    "boot" | "explain" | "choice" | "write" | "help" | "helpConfirm" | "returning"
  >("boot");
  const choiceRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Boot sequence
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [bootDone, setBootDone] = useState(false);

  // Explain typewriter
  const explain = useTypewriter(EXPLAIN_LINES, phase === "explain" || phase === "choice" || phase === "write" || phase === "help" || phase === "helpConfirm");

  // Help prompt typewriter
  const [helpLine, setHelpLine] = useState("");
  const [helpDone, setHelpDone] = useState(false);

  // Boot phase
  useEffect(() => {
    if (phase !== "boot") return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_CODE.length) {
        setBootLines((prev) => [...prev, BOOT_CODE[i]]);
        i++;
      } else {
        clearInterval(interval);
        setBootDone(true);
        setTimeout(() => {
          if (existingName) setPhase("returning");
          else setPhase("explain");
        }, 400);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [phase, existingName]);

  // Explain done → choice
  useEffect(() => {
    if (explain.done && phase === "explain") {
      setPhase("choice");
    }
  }, [explain.done, phase]);

  // Focus inputs
  useEffect(() => {
    if (phase === "choice") setTimeout(() => choiceRef.current?.focus(), 200);
    if (phase === "helpConfirm") setTimeout(() => confirmRef.current?.focus(), 200);
    if (phase === "returning") setTimeout(() => confirmRef.current?.focus(), 200);
  }, [phase]);

  // Help prompt typewriter
  useEffect(() => {
    if (phase !== "help") return;
    let i = 0;
    const timer = setInterval(() => {
      if (i < HELPED_PROMPT.length) {
        setHelpLine(HELPED_PROMPT.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setHelpDone(true);
        setTimeout(() => setPhase("helpConfirm"), 500);
      }
    }, 15);
    return () => clearInterval(timer);
  }, [phase]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [explain.displayed, phase, bootLines, helpLine]);

  // Choice handler
  const handleChoice = useCallback((key: string) => {
    const k = key.toLowerCase();
    if (k === "w") setPhase("write");
    else if (k === "h") setPhase("help");
  }, []);

  // Skip boot
  const skipBoot = useCallback(() => {
    if (phase === "boot") {
      setBootLines([...BOOT_CODE]);
      setBootDone(true);
      if (existingName) setPhase("returning");
      else setPhase("explain");
    } else if (phase === "explain") {
      explain.skipToEnd();
    }
  }, [phase, existingName, explain]);

  const renderLine = (line: { text: string; type: string }, i: number, isLast: boolean, showCursor: boolean) => (
    <div key={i} className={`mb-2 ${
      line.type === "system" ? "text-neon-green/30 text-[10px] uppercase tracking-widest" :
      line.type === "emphasis" ? "text-neon-green" :
      "text-neon-green/70"
    }`}>
      {line.type === "sysop" && <span className="text-neon-green/40">SYSOP&gt; </span>}
      {line.text}
      {isLast && showCursor && <span className="inline-block w-2 h-4 bg-neon-green/80 animate-pulse ml-0.5 align-middle" />}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="w-full h-full flex flex-col items-center justify-center"
      onClick={phase === "boot" || phase === "explain" ? skipBoot : undefined}
    >
      <div className="w-full max-w-lg px-4">
        <div className="bg-bg-deep border border-neon-green/20 rounded-sm overflow-hidden relative crt-terminal"
          style={{ animation: "flicker-in 0.5s ease-out forwards, glow-surge-green 1s ease-out 0.5s forwards" }}>

          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,20,0.015) 2px, rgba(57,255,20,0.015) 4px)",
          }} />
          <div className="crt-scanline-bar" style={{ animationDuration: "3s" }} />

          {/* Header */}
          <div className="border-b border-neon-green/10 px-4 py-1.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-neon-green/60 text-[9px] font-mono">●</span>
              <span className="text-neon-green/40 text-[9px] font-mono tracking-widest">SYSOP TERMINAL</span>
            </div>
            <span className={`text-[8px] font-mono ${phase === "boot" ? "text-amber/50 animate-pulse" : "text-neon-green/30"}`}>
              {phase === "boot" ? "BOOTING..." : "CONNECTED"}
            </span>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="p-4 font-mono text-sm leading-relaxed h-[320px] overflow-y-auto relative"
            onClick={() => { choiceRef.current?.focus(); confirmRef.current?.focus(); }}>

            {/* Boot */}
            {phase === "boot" && (
              <div className="space-y-0.5">
                {bootLines.map((line, i) => (
                  <div key={i} className="text-neon-green/30 text-[9px] uppercase tracking-wider boot-flicker-in">
                    {line}
                  </div>
                ))}
                {!bootDone && <span className="inline-block w-2 h-3 bg-neon-green/50 animate-pulse" />}
                {bootDone && <div className="text-neon-green text-[10px] mt-2 font-bold">SYSTEM READY</div>}
              </div>
            )}

            {/* Explain typewriter */}
            {phase !== "boot" && phase !== "returning" && explain.displayed.map((line, i) => {
              const isLast = i === explain.displayed.length - 1;
              return renderLine(line, i, isLast, !explain.done && phase === "explain");
            })}

            {/* Choice: W or H */}
            {phase === "choice" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <span className="text-cyan">&gt;</span>
                  <span className="text-neon-green">(W)</span>
                  <span className="text-text-secondary text-xs">I&apos;ll write my own</span>
                  <span className="text-text-dim">/</span>
                  <span className="text-amber">(H)</span>
                  <span className="text-text-secondary text-xs">Help me, SYSOP</span>
                </div>
                <input ref={choiceRef} type="text" maxLength={1} autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "w" || e.key === "W" || e.key === "h" || e.key === "H") {
                      handleChoice(e.key);
                    }
                  }}
                  className="absolute opacity-0 w-0 h-0"
                  spellCheck={false} autoComplete="off" />
              </motion.div>
            )}

            {/* Write — sarcastic goodbye */}
            {phase === "write" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
                <div className="mb-1">
                  <span className="text-neon-green">&gt; </span>
                  <span className="text-neon-green font-bold">W</span>
                </div>
                <div className="text-neon-green/70 mb-3">
                  <span className="text-neon-green/40">SYSOP&gt; </span>
                  Good. Don&apos;t embarrass me out there, runner.
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  onAnimationComplete={() => {
                    setTimeout(() => onDismiss({ mode: "write" }), 500);
                  }}
                  className="text-text-dim text-[9px]"
                >
                  LOADING COMBAT INTERFACE...
                </motion.div>
              </motion.div>
            )}

            {/* Help — SYSOP writes prompt */}
            {(phase === "help" || phase === "helpConfirm") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3" onClick={(e) => e.stopPropagation()}>
                <div className="mb-1">
                  <span className="text-neon-green">&gt; </span>
                  <span className="text-neon-green font-bold">H</span>
                </div>
                <div className="text-neon-green/70 mb-2">
                  <span className="text-neon-green/40">SYSOP&gt; </span>
                  Fine. Here&apos;s something to keep you alive:
                </div>
                <div className="bg-bg-surface border border-cyan/20 rounded-sm p-2 mb-2">
                  <span className="text-cyan text-xs font-mono">&quot;{helpLine}&quot;</span>
                  {!helpDone && <span className="inline-block w-2 h-3 bg-cyan/80 animate-pulse ml-0.5 align-middle" />}
                </div>

                {phase === "helpConfirm" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="text-neon-green/70 mb-2">
                      <span className="text-neon-green/40">SYSOP&gt; </span>
                      Basic. Predictable. But it&apos;ll survive level 1. Barely. Use it?
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan">&gt; (Y/n)</span>
                      <input ref={confirmRef} type="text" maxLength={3} autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = (e.target as HTMLInputElement).value.trim().toLowerCase();
                            if (v === "" || v === "y" || v === "yes") {
                              onDismiss({ mode: "helped", prompt: HELPED_PROMPT });
                            } else {
                              // N → go write your own
                              onDismiss({ mode: "write" });
                            }
                          }
                        }}
                        className="w-8 bg-transparent border-none outline-none text-neon-green font-mono text-sm uppercase"
                        spellCheck={false} autoComplete="off" />
                      <span className="inline-block w-2 h-4 bg-neon-green/80 animate-pulse" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Returning user */}
            {phase === "returning" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3" onClick={(e) => e.stopPropagation()}>
                <div className="text-neon-green/70 mb-2">
                  <span className="text-neon-green/40">SYSOP&gt; </span>
                  {existingName}. Back for more, console cowboy?
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan">&gt; Jack in?</span>
                  <span className="text-text-dim">(Y/n)</span>
                  <input ref={confirmRef} type="text" maxLength={3} autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = (e.target as HTMLInputElement).value.trim().toLowerCase();
                        if (v === "" || v === "y" || v === "yes") {
                          onDismiss({ mode: "write" });
                        }
                      }
                    }}
                    className="w-8 bg-transparent border-none outline-none text-neon-green font-mono text-sm uppercase"
                    spellCheck={false} autoComplete="off" />
                  <span className="inline-block w-2 h-4 bg-neon-green/80 animate-pulse" />
                </div>
                <a href="/lore" onClick={(e) => e.stopPropagation()}
                  className="text-[9px] font-mono text-amber/30 hover:text-amber transition-colors mt-2 inline-block">
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

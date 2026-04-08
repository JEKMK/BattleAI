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

const CHAR_SPEED = 18;

interface SysopTerminalProps {
  onDismiss: (runnerName: string) => void;
  quickMode?: boolean; // skip typewriter, just name input + confirm
  existingName?: string | null; // skip name input if already known
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
      const speed = line.type === "system" ? 10 : CHAR_SPEED;
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

export function SysopTerminal({ onDismiss, quickMode = false, existingName }: SysopTerminalProps) {
  // If we already have a name, skip straight to confirm
  const initialPhase = existingName ? "confirm" : (quickMode ? "name" : "connecting");
  const [phase, setPhase] = useState<"connecting" | "intro" | "name" | "post" | "confirm">(initialPhase);
  const [runnerName, setRunnerName] = useState(existingName || "");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Intro typewriter
  const intro = useTypewriter(SYSOP_LINES, !quickMode && (phase === "intro" || phase === "name" || phase === "post" || phase === "confirm"));

  // Post-name typewriter lines (generated after name is submitted)
  const [postLines, setPostLines] = useState<{ text: string; type: string }[]>([]);
  const post = useTypewriter(postLines, phase === "post" || phase === "confirm");

  // Connecting → intro
  useEffect(() => {
    if (phase !== "connecting") return;
    const timer = setTimeout(() => setPhase("intro"), 900);
    return () => clearTimeout(timer);
  }, [phase]);

  // Intro done → name input
  useEffect(() => {
    if (intro.done && phase === "intro") setPhase("name");
  }, [intro.done, phase]);

  // Focus name input
  useEffect(() => {
    if (phase === "name" && inputRef.current) inputRef.current.focus();
  }, [phase]);

  // Post typewriter done → confirm prompt
  useEffect(() => {
    if (post.done && phase === "post") {
      setPhase("confirm");
      setTimeout(() => confirmRef.current?.focus(), 100);
    }
  }, [post.done, phase]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [intro.displayed, post.displayed, phase, nameSubmitted]);

  const submitName = useCallback(() => {
    const name = runnerName.trim().toUpperCase() || "ANONYMOUS";
    setRunnerName(name);
    setNameSubmitted(true);
    localStorage.setItem("battleai_runner", JSON.stringify({ name, createdAt: new Date().toISOString() }));
    setPostLines([
      { text: `${name}. The matrix will remember that name — one way or another.`, type: "sysop" },
      { text: "Show it what you've got, console cowboy.", type: "emphasis" },
    ]);
    if (quickMode) {
      setTimeout(() => setPhase("confirm"), 200);
    } else {
      setTimeout(() => setPhase("post"), 400);
    }
  }, [runnerName, quickMode]);

  const handleConfirm = useCallback((value: string) => {
    const v = value.trim().toLowerCase();
    if (v === "y" || v === "yes" || v === "") {
      onDismiss(runnerName);
    }
  }, [runnerName, onDismiss]);

  const skipAll = useCallback(() => {
    if (phase === "connecting") { setPhase("intro"); return; }
    if (phase === "intro") { intro.skipToEnd(); return; }
    if (phase === "post") { post.skipToEnd(); return; }
  }, [phase, intro, post]);

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
      onClick={phase === "intro" || phase === "connecting" || phase === "post" ? skipAll : undefined}
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
            <span className={`text-[8px] font-mono ${phase === "connecting" ? "text-amber/50 animate-pulse" : "text-neon-green/30"}`}>
              {phase === "connecting" ? "CONNECTING..." : "CONNECTED"}
            </span>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="p-4 font-mono text-sm leading-relaxed h-[320px] overflow-y-auto relative">
            {/* Connecting */}
            {phase === "connecting" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full gap-3">
                <div className="text-neon-green/20 text-[10px] uppercase tracking-[0.5em]">ESTABLISHING NEURAL LINK</div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div key={i} className="w-2 h-2 bg-neon-green/40 rounded-sm"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
                <div className="text-neon-green/10 text-[8px] font-mono">CHIBA CITY RELAY NODE // ENCRYPTED</div>
              </motion.div>
            )}

            {/* Intro typewriter */}
            {phase !== "connecting" && intro.displayed.map((line, i) => {
              const isLast = i === intro.displayed.length - 1;
              return renderLine(line, i, isLast, !intro.done && phase === "intro");
            })}

            {/* Name input */}
            {phase === "name" && !nameSubmitted && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={quickMode ? "" : "mt-2"} onClick={(e) => e.stopPropagation()}>
                {quickMode && (
                  <div className="text-neon-green/70 mb-2">
                    <span className="text-neon-green/40">SYSOP&gt; </span>
                    AI vs AI. Your prompt is your weapon. First — who are you?
                  </div>
                )}
                <div className="text-amber mb-2">SYSOP&gt; What do they call you, runner?</div>
                <div className="flex items-center gap-2">
                  <span className="text-neon-green">&gt;</span>
                  <input ref={inputRef} type="text" value={runnerName}
                    onChange={(e) => setRunnerName(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => e.key === "Enter" && runnerName.trim() && submitName()}
                    className="flex-1 bg-transparent border-none outline-none text-neon-green font-mono text-sm uppercase"
                    placeholder="ENTER YOUR HANDLE..." spellCheck={false} autoComplete="off" />
                </div>
              </motion.div>
            )}

            {/* Name submitted echo */}
            {nameSubmitted && (
              <>
                <div className="text-amber mt-2 mb-1">SYSOP&gt; What do they call you, runner?</div>
                <div className="mb-2">
                  <span className="text-neon-green">&gt; </span>
                  <span className="text-neon-green font-bold">{runnerName}</span>
                </div>
              </>
            )}

            {/* Post-name typewriter */}
            {(phase === "post" || phase === "confirm") && post.displayed.map((line, i) => {
              const isLast = i === post.displayed.length - 1;
              return renderLine(line, `post-${i}` as unknown as number, isLast, !post.done && phase === "post");
            })}

            {/* Terminal confirm prompt */}
            {phase === "confirm" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <span className="text-cyan">&gt; Jack in?</span>
                  <span className="text-text-dim">(Y/n)</span>
                  <input ref={confirmRef} type="text" maxLength={3}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirm((e.target as HTMLInputElement).value);
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

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Line {
  text: string;
  type: "system" | "sysop" | "input" | "emphasis" | "pause";
  delay?: number;
}

const INTRO_SEQUENCE: Line[] = [
  { text: "ONO-SENDAI CYBERSPACE VII — BOOT SEQUENCE", type: "system", delay: 8 },
  { text: "LOADING NEURAL INTERFACE...", type: "system", delay: 8 },
  { text: "CHIBA CITY RELAY NODE — CONNECTED", type: "system", delay: 8 },
  { text: "", type: "pause", delay: 300 },
  { text: "Well, well. Another one jacking in from the Sprawl.", type: "sysop", delay: 18 },
  { text: "", type: "pause", delay: 600 },
  { text: "I'm SYSOP. I've been running inside this matrix since before Tessier-Ashpool built their first ICE wall. I watched Dixie Flatline die. Twice.", type: "sysop", delay: 12 },
  { text: "", type: "pause", delay: 800 },
  { text: "And now you want to play console cowboy.", type: "sysop", delay: 18 },
  { text: "", type: "pause", delay: 600 },
  { text: "Here's the deal, rookie.", type: "emphasis", delay: 22 },
  { text: "", type: "pause", delay: 400 },
  { text: "The zaibatsus — Anthropic, Google, OpenAI — they build constructs. Neural combat programs forged in silicon. Each one thinks different. Some are fast like a Chiba street razorgirl. Some are precise like Wintermute on a good day. None of them care if you live or flatline.", type: "sysop", delay: 8 },
  { text: "", type: "pause", delay: 800 },
  { text: "You write the neural template. What your construct knows, what it does — that's on you. No simstim, no remote. Once it's in the matrix, it fights alone.", type: "sysop", delay: 10 },
  { text: "", type: "pause", delay: 600 },
  { text: "Win and you crack their code. See how they think. Take what's useful.", type: "emphasis", delay: 18 },
  { text: "", type: "pause", delay: 500 },
  { text: "Lose... and yours flatlines. Burned out like a Sense/Net ice-breaker on a bad run. The matrix doesn't do second chances.", type: "sysop", delay: 12 },
  { text: "", type: "pause", delay: 500 },
];

const POST_NAME_SEQUENCE: Line[] = [
  { text: "RUNNER PROFILE INITIALIZED — ONO-SENDAI LINKED", type: "system", delay: 8 },
  { text: "", type: "pause", delay: 300 },
  { text: "Most runners flatline before level 3. Same as Chiba — the weak ones don't last past the first alley.", type: "sysop", delay: 12 },
  { text: "", type: "pause", delay: 600 },
  { text: "Your Ono-Sendai has limited RAM. Write what you can. Crack ICE, earn more. The rest... you figure out.", type: "sysop", delay: 12 },
  { text: "", type: "pause", delay: 600 },
  { text: "15 barriers ahead. Nobody's cracked them all. Not since Screaming Fist.", type: "emphasis", delay: 18 },
  { text: "", type: "pause", delay: 500 },
  { text: "I won't tell you how to fight. Dixie learned the hard way and so will you. Watch what your construct does. Read the aftermath. The patterns are there if you're smart enough to see them.", type: "sysop", delay: 8 },
  { text: "", type: "pause", delay: 600 },
  { text: "The matrix is waiting, console cowboy.", type: "emphasis", delay: 22 },
  { text: "", type: "pause", delay: 600 },
];

function useTypewriter(lines: Line[], enabled: boolean = true) {
  const [displayedLines, setDisplayedLines] = useState<{ text: string; type: string }[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setIsTyping(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (currentLine >= lines.length) {
      setIsDone(true);
      setIsTyping(false);
      return;
    }

    const line = lines[currentLine];

    if (line.type === "pause") {
      const timer = setTimeout(() => {
        setCurrentLine((prev) => prev + 1);
        setCurrentChar(0);
      }, line.delay || 500);
      return () => clearTimeout(timer);
    }

    if (currentChar === 0 && line.text.length > 0) {
      setDisplayedLines((prev) => [...prev, { text: "", type: line.type }]);
    }

    if (currentChar < line.text.length) {
      const speed = line.delay || 15;
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const next = [...prev];
          next[next.length - 1] = { text: line.text.slice(0, currentChar + 1), type: line.type };
          return next;
        });
        setCurrentChar((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }

    // Line done
    const timer = setTimeout(() => {
      setCurrentLine((prev) => prev + 1);
      setCurrentChar(0);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentLine, currentChar, lines, enabled]);

  return { displayedLines, isDone, isTyping };
}

export default function LorePage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"intro" | "name" | "post" | "ready">("intro");
  const [runnerName, setRunnerName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);

  const intro = useTypewriter(INTRO_SEQUENCE, true);
  const post = useTypewriter(POST_NAME_SEQUENCE, phase === "post" || phase === "ready");

  // ESC to go back to game
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  // Scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [intro.displayedLines.length, post.displayedLines.length, phase]);

  // Phase transitions
  useEffect(() => {
    if (intro.isDone && phase === "intro") setPhase("name");
  }, [intro.isDone, phase]);

  useEffect(() => {
    if (phase === "name" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  useEffect(() => {
    if (post.isDone && phase === "post") setPhase("ready");
  }, [post.isDone, phase]);

  const submitName = useCallback(() => {
    if (!runnerName.trim()) return;
    const name = runnerName.trim().toUpperCase();
    setRunnerName(name);
    setNameSubmitted(true);

    // Save runner profile
    localStorage.setItem("battleai_runner", JSON.stringify({
      name,
      createdAt: new Date().toISOString(),
    }));

    setTimeout(() => setPhase("post"), 500);
  }, [runnerName]);

  const jackIn = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="h-screen bg-bg-deep flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-full max-h-[600px] bg-bg-panel border border-cyan/30 rounded-sm flex flex-col overflow-hidden relative crt-terminal">
        {/* CRT scanlines overlay */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)",
        }} />
        {/* CRT moving scanline bar */}
        <div className="crt-scanline-bar" />
        {/* CRT vignette */}
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)",
        }} />
        {/* Terminal header */}
        <div className="bg-bg-elevated border-b border-cyan/20 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-cyan text-xs font-mono animate-flicker">&gt;_</span>
            <span className="text-cyan text-xs font-mono tracking-widest">ONO-SENDAI CYBERSPACE VII</span>
          </div>
          <span className="text-text-dim text-[9px] font-mono">ESC TO EXIT // CHIBA CITY NODE</span>
        </div>

        {/* Terminal body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed">
          {/* Intro sequence */}
          {intro.displayedLines.map((line, i) => (
            <div key={`intro-${i}`} className={`mb-1 ${
              line.type === "system" ? "text-text-dim text-[10px] uppercase tracking-widest" :
              line.type === "emphasis" ? "text-cyan glow-cyan" :
              "text-text-primary"
            }`}>
              {line.type === "sysop" && <span className="text-cyan/60">SYSOP&gt; </span>}
              {line.text}
            </div>
          ))}

          {/* Name input phase */}
          {phase === "name" && !nameSubmitted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <div className="text-amber mb-2">SYSOP&gt; What do they call you, runner?</div>
              <div className="flex items-center gap-2">
                <span className="text-neon-green">&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={runnerName}
                  onChange={(e) => setRunnerName(e.target.value.slice(0, 20))}
                  onKeyDown={(e) => e.key === "Enter" && submitName()}
                  className="flex-1 bg-transparent border-none outline-none text-neon-green font-mono text-sm uppercase"
                  placeholder="ENTER YOUR HANDLE..."
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </motion.div>
          )}

          {/* Name submitted confirmation */}
          {nameSubmitted && phase === "name" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
              <div className="text-neon-green">&gt; {runnerName}</div>
              <div className="text-text-dim text-[10px] uppercase tracking-widest mt-2">PROCESSING...</div>
            </motion.div>
          )}

          {/* Post-name sequence */}
          {(phase === "post" || phase === "ready") && (
            <>
              <div className="text-neon-green mt-2 mb-2">&gt; {runnerName}</div>
              <div className="text-sysop mb-2">
                <span className="text-cyan/60">SYSOP&gt; </span>
                <span className="text-text-primary">{runnerName}. Fine. I&apos;ll remember that name. The matrix will too — one way or another.</span>
              </div>
              {post.displayedLines.map((line, i) => (
                <div key={`post-${i}`} className={`mb-1 ${
                  line.type === "system" ? "text-text-dim text-[10px] uppercase tracking-widest" :
                  line.type === "emphasis" ? "text-cyan glow-cyan" :
                  "text-text-primary"
                }`}>
                  {line.type === "sysop" && <span className="text-cyan/60">SYSOP&gt; </span>}
                  {line.text}
                </div>
              ))}
            </>
          )}

          {/* Jack In button */}
          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-cyan">&gt; Jack in?</span>
                <span className="text-text-dim">(Y/n)</span>
                <input
                  type="text"
                  maxLength={3}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value.trim().toLowerCase();
                      if (v === "" || v === "y" || v === "yes") jackIn();
                    }
                  }}
                  className="w-8 bg-transparent border-none outline-none text-neon-green font-mono text-sm uppercase"
                  spellCheck={false}
                  autoComplete="off"
                />
                <span className="inline-block w-2 h-4 bg-neon-green/80 animate-pulse" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Terminal footer */}
        <div className="border-t border-border px-4 py-1 flex justify-between shrink-0">
          <span className="text-text-dim text-[8px] font-mono">BATTLE AI — SPAWL NEURAL COMBAT ARENA</span>
          <span className="text-text-dim text-[8px] font-mono animate-pulse-glow">
            {intro.isTyping || post.isTyping ? "TRANSMITTING..." : "READY"}
          </span>
        </div>
      </div>
    </div>
  );
}

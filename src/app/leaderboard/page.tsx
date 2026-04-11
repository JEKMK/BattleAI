"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { TUTORIAL_COUNT } from "@/lib/gauntlet";

interface RunnerRow {
  rank: number;
  name: string;
  totalScore: number;
  wins: number;
  losses: number;
  draws: number;
  ram: number;
  currentLevel: number;
  bestScoreDate: string | null;
}

export default function LeaderboardPage() {
  const [runners, setRunners] = useState<RunnerRow[]>([]);
  const [myRank, setMyRank] = useState<number | undefined>();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myToken, setMyToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("battleai_token");
    setMyToken(token);

    fetch("/api/leaderboard", {
      headers: token ? { "x-runner-token": token } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setRunners(data.runners || []);
        setMyRank(data.myRank);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Find my name from localStorage
  let myName: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const runner = JSON.parse(localStorage.getItem("battleai_runner") || "null");
      if (runner?.name) myName = runner.name;
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col items-center p-4">
      {/* Terminal container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-bg-panel border border-cyan/30 rounded-sm overflow-hidden relative crt-terminal">
          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.015) 2px, rgba(0,240,255,0.015) 4px)",
          }} />

          {/* Header */}
          <div className="border-b border-cyan/20 px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-cyan text-xs font-mono animate-flicker">&gt;_</span>
              <span className="text-cyan text-xs font-mono tracking-widest">RUNNER RANKINGS</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-text-dim text-[9px] font-mono">{total} RUNNERS</span>
              <Link href="/" className="text-[9px] font-mono text-amber/50 hover:text-amber transition-colors">
                [BACK TO MATRIX]
              </Link>
            </div>
          </div>

          {/* My rank banner */}
          {myRank && myName && (
            <div className="border-b border-neon-green/10 px-4 py-2 bg-neon-green/5">
              <span className="text-neon-green/40 text-[10px] font-mono">SYSOP&gt; </span>
              <span className="text-neon-green text-[11px] font-mono">
                {myName}, you&apos;re ranked <span className="text-amber font-bold">#{myRank}</span> of {total}.
              </span>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <span className="text-neon-green/50 font-mono text-sm animate-pulse">QUERYING MATRIX...</span>
              </div>
            ) : runners.length === 0 ? (
              <div className="p-8 text-center">
                <span className="text-text-dim font-mono text-sm">No runners yet. Be the first.</span>
              </div>
            ) : (
              <table className="w-full font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-border text-text-dim text-[9px] uppercase tracking-widest">
                    <th className="px-3 py-2 text-left w-10">#</th>
                    <th className="px-3 py-2 text-left">Runner</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-center hidden sm:table-cell">W/D/L</th>
                    <th className="px-3 py-2 text-right hidden sm:table-cell">RAM</th>
                    <th className="px-3 py-2 text-right hidden md:table-cell">LVL</th>
                    <th className="px-3 py-2 text-right hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {runners.map((r) => {
                    const isMe = myName && r.name === myName;
                    const rankColor = r.rank === 1 ? "text-amber" : r.rank === 2 ? "text-cyan" : r.rank === 3 ? "text-neon-green" : "text-text-dim";
                    return (
                      <motion.tr
                        key={r.rank}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: r.rank * 0.03 }}
                        className={`border-b border-border/50 transition-colors ${isMe ? "bg-neon-green/5" : "hover:bg-bg-elevated/50"}`}
                      >
                        <td className={`px-3 py-1.5 font-bold ${rankColor}`}>
                          {r.rank <= 3 ? ["⬡", "⬡", "⬡"][r.rank - 1] : r.rank}
                          {r.rank <= 3 && <span className="ml-1">{r.rank}</span>}
                        </td>
                        <td className={`px-3 py-1.5 ${isMe ? "text-neon-green font-bold" : "text-cyan"}`}>
                          {r.name}
                          {isMe && <span className="text-neon-green/40 ml-1 text-[8px]">← YOU</span>}
                        </td>
                        <td className="px-3 py-1.5 text-right text-amber tabular-nums font-bold">
                          {r.totalScore.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-center hidden sm:table-cell tabular-nums">
                          <span className="text-neon-green">{r.wins}</span>
                          <span className="text-text-dim">/</span>
                          <span className="text-amber">{r.draws}</span>
                          <span className="text-text-dim">/</span>
                          <span className="text-magenta">{r.losses}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right hidden sm:table-cell text-cyan tabular-nums">
                          {r.ram}
                        </td>
                        <td className="px-3 py-1.5 text-right hidden md:table-cell text-text-secondary tabular-nums">
                          {Math.max(0, r.currentLevel - TUTORIAL_COUNT)}
                        </td>
                        <td className="px-3 py-1.5 text-right hidden md:table-cell text-text-dim">
                          {r.bestScoreDate ? new Date(r.bestScoreDate).toLocaleDateString() : "—"}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between">
            <Link href="/" className="text-[9px] font-mono text-cyan/40 hover:text-cyan transition-colors">
              &gt; JACK BACK IN
            </Link>
            <Link href="/lore" className="text-[9px] font-mono text-amber/30 hover:text-amber transition-colors">
              [READ THE LORE]
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

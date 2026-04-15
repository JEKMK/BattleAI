"use client";

import { useRef, useEffect } from "react";
import type { GameState, LogEntry } from "@/lib/types";
import type { FighterCosmetic, Particle, Projectile, FloatingText as FText } from "./types";
import { FACTION_COLORS, TYPE_COLORS } from "./types";
import { toHex, getCanvasDimensions, distance } from "./math";
import { drawHexGrid, glowHex } from "./hex-grid";
import { drawFighter, resetVisualPositions } from "./fighter";
import { spawnParticles, updateAndDrawParticles } from "./particles";
import { spawnProjectile, updateAndDrawProjectiles } from "./projectiles";
import { spawnFloatingText, shortenMessage, updateAndDrawFloatingTexts } from "./floating-text";
import { updateShake, triggerShake } from "./effects";
import { audioEngine } from "@/lib/audio";

interface ArenaProps {
  state: GameState | null;
  redCosmetic?: FighterCosmetic;
  blueCosmetic?: FighterCosmetic;
}

export function Arena({ state, redCosmetic, blueCosmetic }: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const floatingTextsRef = useRef<FText[]>([]);
  const prevTickRef = useRef<number>(-1);
  const hexGlowsRef = useRef<{ x: number; y: number; color: string; life: number }[]>([]);

  // Process new tick logs — spawn particles, audio, text
  useEffect(() => {
    if (!state || state.tick === prevTickRef.current) return;
    prevTickRef.current = state.tick;

    const arenaW = state.arena.width;
    const arenaH = state.arena.height;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasW = canvas.width;

    const tickLogs = state.log.filter((l) => l.tick === state.tick);
    const [red, blue] = state.fighters;

    for (const log of tickLogs) {
      if (log.type === "move") continue;

      // Screen coords for floating text + particles
      const fighter = log.fighter === "red" ? red : blue;
      const targetFighter = log.fighter === "red" ? blue : red;
      const fx = log.x ?? fighter.x;
      const fy = log.y ?? fighter.y;
      const [sx, sy] = toHex(fx, fy, arenaW, arenaH, canvasW);

      // Floating text
      const short = shortenMessage(log.message, log.type);
      const color = TYPE_COLORS[log.type] || "#ffffff";
      const size = log.type === "ko" ? 20 : log.type === "parry" || log.type === "stun" ? 16 : 14;
      spawnFloatingText(floatingTextsRef.current, sx, sy, short, color, size);

      // Hex tile glow
      hexGlowsRef.current.push({ x: fx, y: fy, color, life: 0 });

      // Audio
      switch (log.type) {
        case "hit": audioEngine.play(log.message.includes("Hammer") ? "heavy" : log.message.includes("Spike") ? "shoot" : "punch"); break;
        case "miss": audioEngine.play("miss"); break;
        case "block": audioEngine.play("block"); break;
        case "dodge": audioEngine.play("dodge"); break;
        case "parry": audioEngine.play("parry"); break;
        case "stun": audioEngine.play("stun"); break;
        case "ko": audioEngine.play("ko"); break;
      }

      // Particles by type
      if (log.type === "hit") {
        const isHeavy = log.message.includes("Hammer");
        spawnParticles(particlesRef.current, sx, sy, "#ffb800", isHeavy ? 60 : 30);
        spawnParticles(particlesRef.current, sx, sy, "#ffb800", isHeavy ? 5 : 3, true); // data fragments
        if (isHeavy) triggerShake(5);
      } else if (log.type === "ko") {
        spawnParticles(particlesRef.current, sx, sy, "#ff2d6a", 150);
        spawnParticles(particlesRef.current, sx, sy, "#ff2d6a", 10, true);
        triggerShake(8);
      } else if (log.type === "parry") {
        spawnParticles(particlesRef.current, sx, sy, "#ff2d6a", 20);
      } else if (log.type === "dodge") {
        spawnParticles(particlesRef.current, sx, sy, "#00f0ff", 12);
      } else if (log.type === "stun") {
        spawnParticles(particlesRef.current, sx, sy, "#ff2d6a", 15);
      }

      // Projectiles for ranged attacks
      if ((log.type === "hit" || log.type === "miss") &&
        (log.message.includes("Spike") || log.message.includes("spike") || log.message.includes("scattered"))) {
        const dist = distance(fighter, targetFighter);
        if (dist > 2) {
          const [shootX, shootY] = toHex(fighter.x, fighter.y, arenaW, arenaH, canvasW);
          const [targetX, targetY] = toHex(targetFighter.x, targetFighter.y, arenaW, arenaH, canvasW);
          const factionColor = FACTION_COLORS[fighter.faction] || "#39ff14";
          spawnProjectile(projectilesRef.current, shootX, shootY, targetX, targetY, factionColor, log.type === "hit");
        }
      }
    }

    // Update ambient tension
    if (state.status === "fighting") {
      const hpRatio = red.hp / red.maxHp;
      audioEngine.updateTension(state.tick, hpRatio);
    }
  }, [state?.tick]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const arenaW = state?.arena.width ?? 10;
    const arenaH = state?.arena.height ?? 8;
    const dims = getCanvasDimensions(arenaW, arenaH);
    canvas.width = dims.width;
    canvas.height = dims.height;

    // Reset on new battle
    if (!state || state.tick === 0) {
      resetVisualPositions();
      particlesRef.current = [];
      projectilesRef.current = [];
      floatingTextsRef.current = [];
      hexGlowsRef.current = [];
      prevTickRef.current = -1;
    }

    let time = 0;

    const render = () => {
      time++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Hex grid + data rain + vignette
      drawHexGrid(ctx, arenaW, arenaH, canvas.width, time, state?.bounds);

      // Hex tile glows (from recent actions)
      for (let i = hexGlowsRef.current.length - 1; i >= 0; i--) {
        const g = hexGlowsRef.current[i];
        g.life++;
        const alpha = Math.max(0, 0.3 * (1 - g.life / 8));
        if (alpha <= 0) { hexGlowsRef.current.splice(i, 1); continue; }
        glowHex(ctx, g.x, g.y, arenaW, arenaH, canvas.width, g.color, alpha);
      }

      // Fighters
      if (state) {
        const [red, blue] = state.fighters;
        drawFighter(ctx, red, redCosmetic, arenaW, arenaH, canvas.width, time);
        drawFighter(ctx, blue, blueCosmetic, arenaW, arenaH, canvas.width, time);
      }

      // Projectiles
      updateAndDrawProjectiles(ctx, projectilesRef.current);

      // Particles
      updateAndDrawParticles(ctx, particlesRef.current);

      // Floating text
      updateAndDrawFloatingTexts(ctx, floatingTextsRef.current);

      // Screen shake
      updateShake(canvas);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state]);

  const arenaW = state?.arena.width ?? 10;
  const arenaH = state?.arena.height ?? 8;
  const dims = getCanvasDimensions(arenaW, arenaH);

  return (
    <canvas
      ref={canvasRef}
      className="border border-border-bright rounded-sm w-full"
      style={{
        maxWidth: `${dims.width}px`,
        aspectRatio: `${dims.width} / ${dims.height}`,
      }}
    />
  );
}

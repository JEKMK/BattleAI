"use client";

import { useRef, useEffect } from "react";
import type { GameState } from "@/lib/types";
import type { FighterCosmetic, Particle, Projectile, FloatingText as FText } from "./types";
import { FACTION_COLORS, TYPE_COLORS } from "./types";
import { toIso, getCanvasDimensions, distance } from "./math";
import { drawHexGrid, glowTile } from "./hex-grid";
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
  const tileGlowsRef = useRef<{ x: number; y: number; color: string; life: number }[]>([]);

  // Process new tick logs
  useEffect(() => {
    if (!state || state.tick === prevTickRef.current) return;
    prevTickRef.current = state.tick;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const arenaW = state.arena.width;
    const arenaH = state.arena.height;
    const cw = canvas.width;
    const ch = canvas.height;

    const tickLogs = state.log.filter((l) => l.tick === state.tick);
    const [red, blue] = state.fighters;

    for (const log of tickLogs) {
      if (log.type === "move") continue;

      const fighter = log.fighter === "red" ? red : blue;
      const targetFighter = log.fighter === "red" ? blue : red;
      const fx = log.x ?? fighter.x;
      const fy = log.y ?? fighter.y;
      const [sx, sy] = toIso(fx, fy, arenaW, arenaH, cw, ch);

      // Floating text
      const short = shortenMessage(log.message, log.type);
      const color = TYPE_COLORS[log.type] || "#ffffff";
      const size = log.type === "ko" ? 22 : log.type === "parry" || log.type === "stun" ? 16 : 14;
      spawnFloatingText(floatingTextsRef.current, sx, sy - 20, short, color, size);

      // Tile glow
      tileGlowsRef.current.push({ x: fx, y: fy, color, life: 0 });

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

      // Particles
      if (log.type === "hit") {
        const isHeavy = log.message.includes("Hammer");
        spawnParticles(particlesRef.current, sx, sy - 10, "#ffb800", isHeavy ? 60 : 30);
        spawnParticles(particlesRef.current, sx, sy - 10, "#ffb800", isHeavy ? 6 : 3, true);
        if (isHeavy) triggerShake(5);
      } else if (log.type === "ko") {
        spawnParticles(particlesRef.current, sx, sy - 10, "#ff2d6a", 150);
        spawnParticles(particlesRef.current, sx, sy - 10, "#ff2d6a", 12, true);
        triggerShake(8);
      } else if (log.type === "parry") {
        spawnParticles(particlesRef.current, sx, sy - 10, "#ff2d6a", 20);
      } else if (log.type === "dodge") {
        spawnParticles(particlesRef.current, sx, sy - 10, "#00f0ff", 12);
      } else if (log.type === "stun") {
        spawnParticles(particlesRef.current, sx, sy - 10, "#ff2d6a", 15);
      }

      // Projectiles
      if ((log.type === "hit" || log.type === "miss") &&
        (log.message.includes("Spike") || log.message.includes("spike") || log.message.includes("scattered"))) {
        const dist = distance(fighter, targetFighter);
        if (dist > 2) {
          const [shootX, shootY] = toIso(fighter.x, fighter.y, arenaW, arenaH, cw, ch);
          const [targetX, targetY] = toIso(targetFighter.x, targetFighter.y, arenaW, arenaH, cw, ch);
          const factionColor = FACTION_COLORS[fighter.faction] || "#39ff14";
          spawnProjectile(projectilesRef.current, shootX, shootY - 12, targetX, targetY - 12, factionColor, log.type === "hit");
        }
      }
    }

    // Ambient tension
    if (state.status === "fighting") {
      audioEngine.updateTension(state.tick, red.hp / red.maxHp);
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

    if (!state || state.tick === 0) {
      resetVisualPositions();
      particlesRef.current = [];
      projectilesRef.current = [];
      floatingTextsRef.current = [];
      tileGlowsRef.current = [];
      prevTickRef.current = -1;
    }

    let time = 0;

    const render = () => {
      time++;
      const cw = canvas.width;
      const ch = canvas.height;

      // Clear — transparent so page bg shows through
      ctx.clearRect(0, 0, cw, ch);

      // Isometric grid + data rain + vignette
      drawHexGrid(ctx, arenaW, arenaH, cw, ch, time, state?.bounds);

      // Tile glows from actions
      for (let i = tileGlowsRef.current.length - 1; i >= 0; i--) {
        const g = tileGlowsRef.current[i];
        g.life++;
        const alpha = Math.max(0, 0.35 * (1 - g.life / 10));
        if (alpha <= 0) { tileGlowsRef.current.splice(i, 1); continue; }
        glowTile(ctx, g.x, g.y, arenaW, arenaH, cw, ch, g.color, alpha);
      }

      // Fighters — draw back-to-front (higher isoY = closer to camera = drawn later)
      if (state) {
        const [red, blue] = state.fighters;
        const redIsoY = (red.x + red.y);
        const blueIsoY = (blue.x + blue.y);

        const first = redIsoY <= blueIsoY ? red : blue;
        const second = redIsoY <= blueIsoY ? blue : red;
        const firstCosmetic = redIsoY <= blueIsoY ? redCosmetic : blueCosmetic;
        const secondCosmetic = redIsoY <= blueIsoY ? blueCosmetic : redCosmetic;

        drawFighter(ctx, first, firstCosmetic, arenaW, arenaH, cw, ch, time);
        drawFighter(ctx, second, secondCosmetic, arenaW, arenaH, cw, ch, time);
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
      className="w-full"
      style={{
        maxWidth: `${Math.max(dims.width, 620)}px`,
        aspectRatio: `${dims.width} / ${dims.height}`,
      }}
    />
  );
}

"use client";

import { useRef, useEffect } from "react";
import type { GameState, LogEntry } from "@/lib/types";

const CELL_SIZE = 44;
const PADDING = 3;

interface ArenaProps {
  state: GameState | null;
}

const FACTION_COLORS: Record<string, string> = {
  anthropic: "#b44aff",
  google: "#00f0ff",
  openai: "#39ff14",
};

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Projectile {
  sx: number; sy: number; // start pixel position
  tx: number; ty: number; // target pixel position
  x: number; y: number;   // current position
  color: string;
  hit: boolean;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
}

const TYPE_COLORS: Record<string, string> = {
  hit: "#ffb800",
  miss: "#4a4a5e",
  block: "#00f0ff",
  dodge: "#00f0ff",
  parry: "#ff2d6a",
  stun: "#ff2d6a",
  attack: "#ffb800",
  ko: "#ff2d6a",
  system: "#ffb800",
  move: "#4a4a5e88",
};

/** Short text for floating above fighters — full message goes to the log */
function shortenMessage(msg: string, type: string): string {
  // Extract damage number
  const dmgMatch = msg.match(/-(\d+)/);
  const dmg = dmgMatch ? dmgMatch[1] : null;

  if (type === "hit" && dmg) {
    if (msg.includes("COMBO")) return `COMBO -${dmg}!`;
    if (msg.includes("MEGA")) return `MEGA -${dmg}!!`;
    if (msg.includes("Hammer")) return `HAMMER -${dmg}!`;
    if (msg.includes("Spike")) return `SPIKE -${dmg}`;
    if (msg.includes("Burn")) return `BURN -${dmg}`;
    if (msg.includes("Firewall burn")) return `WALL -${dmg}`;
    return `-${dmg}`;
  }
  if (type === "miss") {
    if (msg.includes("scattered")) return "MISS";
    if (msg.includes("firewall") || msg.includes("shield")) return "BLOCKED";
    if (msg.includes("ghost") || msg.includes("phased") || msg.includes("shifted")) return "DODGED";
    if (msg.includes("fizzles")) return "WHIFF";
    if (msg.includes("dissipates") || msg.includes("failed")) return "TOO FAR";
    return "MISS";
  }
  if (type === "block") return "SHIELD";
  if (type === "dodge") return "GHOST";
  if (type === "parry") {
    if (msg.includes("triggers") || msg.includes("reflects") || msg.includes("perfect") || msg.includes("deflects")) return "BLACK ICE!";
    return "B.ICE";
  }
  if (type === "stun") return "STUNNED";
  if (type === "ko") return "FLATLINED";
  if (type === "system") return "";
  return msg.slice(0, 12);
}

export function Arena({ state }: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const prevTickRef = useRef<number>(-1);

  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x * CELL_SIZE + CELL_SIZE / 2 + PADDING,
        y: y * CELL_SIZE + CELL_SIZE / 2 + PADDING,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 0,
        maxLife: 15 + Math.random() * 20,
        color,
        size: 1.5 + Math.random() * 3,
      });
    }
  }

  function spawnFloatingText(x: number, y: number, text: string, color: string, size: number = 14) {
    floatingTextsRef.current.push({
      x: x * CELL_SIZE + CELL_SIZE / 2 + PADDING,
      y: y * CELL_SIZE + PADDING - 4,
      text,
      color,
      life: 0,
      maxLife: 70,
      size,
    });
  }

  useEffect(() => {
    if (!state || state.tick === prevTickRef.current) return;
    prevTickRef.current = state.tick;

    // Process new logs for this tick
    const tickLogs = state.log.filter((l) => l.tick === state.tick);
    for (const log of tickLogs) {
      if (log.type === "move") continue; // Don't show move text

      const color = TYPE_COLORS[log.type] || "#e0e0e8";
      const x = log.x ?? (log.fighter === "red" ? state.fighters[0].x : state.fighters[1].x);
      const y = log.y ?? (log.fighter === "red" ? state.fighters[0].y : state.fighters[1].y);

      // Floating text — short version for arena, full message goes to log
      const shortMsg = shortenMessage(log.message, log.type);
      const size = log.type === "ko" ? 20 : log.type === "parry" || log.type === "stun" ? 14 : 12;
      spawnFloatingText(x, y, shortMsg, color, size);

      // Projectiles for ranged attacks
      if ((log.type === "hit" || log.type === "miss") && (log.message.includes("Spike") || log.message.includes("spike") || log.message.includes("scattered"))) {
        // This is a shot — spawn projectile
        const shooterIdx = log.fighter === "red" ? 0 : 1;
        const targetIdx = log.fighter === "red" ? 1 : 0;
        const shooter = state.fighters[shooterIdx];
        const target = state.fighters[targetIdx];
        const dist = Math.abs(shooter.x - target.x) + Math.abs(shooter.y - target.y);

        if (dist > 2) {
          const sColor = FACTION_COLORS[shooter.faction] || "#ffffff";
          // Offset angle so two shots don't overlap: red offsets up, blue offsets down
          const angleOffset = log.fighter === "red" ? -6 : 6;
          const sx = shooter.x * CELL_SIZE + CELL_SIZE / 2 + PADDING;
          const sy = shooter.y * CELL_SIZE + CELL_SIZE / 2 + PADDING + 16 + angleOffset;
          const tx = target.x * CELL_SIZE + CELL_SIZE / 2 + PADDING;
          const ty = target.y * CELL_SIZE + CELL_SIZE / 2 + PADDING + 16 + angleOffset;

          projectilesRef.current.push({
            sx, sy, tx, ty,
            x: sx, y: sy,
            color: sColor,
            hit: log.type === "hit",
            life: 0,
            maxLife: 15,
            trail: [],
          });
        }
      }

      // Particles
      if (log.type === "hit") {
        const targetIdx = log.fighter === "red" ? 1 : 0;
        const target = state.fighters[targetIdx];
        spawnParticles(target.x, target.y, "#ffb800", 10);
      } else if (log.type === "ko") {
        const targetIdx = log.fighter === "red" ? 0 : 1;
        const target = state.fighters[targetIdx];
        spawnParticles(target.x, target.y, "#ff2d6a", 30);
      } else if (log.type === "parry") {
        const actorIdx = log.fighter === "red" ? 0 : 1;
        const actor = state.fighters[actorIdx];
        spawnParticles(actor.x, actor.y, "#ff2d6a", 15);
      } else if (log.type === "dodge") {
        const actorIdx = log.fighter === "red" ? 0 : 1;
        const actor = state.fighters[actorIdx];
        spawnParticles(actor.x, actor.y, "#00f0ff", 8);
      } else if (log.type === "stun") {
        const actorIdx = log.fighter === "red" ? 0 : 1;
        const actor = state.fighters[actorIdx];
        spawnParticles(actor.x, actor.y, "#ff2d6a", 12);
      }
    }
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const arenaW = state?.arena.width ?? 10;
    const arenaH = state?.arena.height ?? 8;
    const width = arenaW * CELL_SIZE + PADDING * 2;
    const height = arenaH * CELL_SIZE + PADDING * 2 + 24; // extra space for floating text
    canvas.width = width;
    canvas.height = height;

    function render() {
      if (!ctx || !canvas) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // Background
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, cw, ch);

      const aw = state?.arena.width ?? 10;
      const ah = state?.arena.height ?? 8;

      // Grid
      ctx.strokeStyle = "#00f0ff18";
      ctx.lineWidth = 0.7;
      for (let x = 0; x <= aw; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE + PADDING, PADDING + 16);
        ctx.lineTo(x * CELL_SIZE + PADDING, ah * CELL_SIZE + PADDING + 16);
        ctx.stroke();
      }
      for (let y = 0; y <= ah; y++) {
        ctx.beginPath();
        ctx.moveTo(PADDING, y * CELL_SIZE + PADDING + 16);
        ctx.lineTo(aw * CELL_SIZE + PADDING, y * CELL_SIZE + PADDING + 16);
        ctx.stroke();
      }

      // Grid intersection dots
      ctx.fillStyle = "#00f0ff30";
      for (let x = 0; x <= aw; x++) {
        for (let y = 0; y <= ah; y++) {
          ctx.fillRect(x * CELL_SIZE + PADDING - 1, y * CELL_SIZE + PADDING + 16 - 1, 2, 2);
        }
      }

      if (state) {
        // Draw firewall zone — only when bounds have shrunk
        if (state.bounds) {
          const b = state.bounds;
          const hasShrunk = b.minX > 0 || b.minY > 0 || b.maxX < aw - 1 || b.maxY < ah - 1;

          if (hasShrunk) {
            const gridOffY = PADDING + 16;

            // Dead zones (red tint outside bounds)
            ctx.fillStyle = "#ff2d6a18";
            if (b.minY > 0)
              ctx.fillRect(PADDING, gridOffY, aw * CELL_SIZE, b.minY * CELL_SIZE);
            if (b.maxY < ah - 1)
              ctx.fillRect(PADDING, gridOffY + (b.maxY + 1) * CELL_SIZE, aw * CELL_SIZE, (ah - 1 - b.maxY) * CELL_SIZE);
            if (b.minX > 0)
              ctx.fillRect(PADDING, gridOffY, b.minX * CELL_SIZE, ah * CELL_SIZE);
            if (b.maxX < aw - 1)
              ctx.fillRect(PADDING + (b.maxX + 1) * CELL_SIZE, gridOffY, (aw - 1 - b.maxX) * CELL_SIZE, ah * CELL_SIZE);

            // Firewall border — aligned to grid
            ctx.strokeStyle = "#ff2d6a66";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(
              PADDING + b.minX * CELL_SIZE,
              gridOffY + b.minY * CELL_SIZE,
              (b.maxX - b.minX + 1) * CELL_SIZE,
              (b.maxY - b.minY + 1) * CELL_SIZE,
            );
            ctx.setLineDash([]);
          }
        }

        const [red, blue] = state.fighters;

        for (const fighter of [red, blue]) {
          const color = FACTION_COLORS[fighter.faction] || "#ffffff";
          const px = fighter.x * CELL_SIZE + PADDING;
          const py = fighter.y * CELL_SIZE + PADDING + 16;
          const cx = px + CELL_SIZE / 2;
          const cy = py + CELL_SIZE / 2;

          // Determine state color for background
          let stateColor = color; // default: faction color
          let glowColor = color;
          let glowRadius = 16;

          if (fighter.isStunned) {
            stateColor = "#ff2d6a";
            glowColor = "#ff2d6a";
            glowRadius = 8;
          } else if (fighter.isParrying) {
            stateColor = "#ff2d6a";
            glowColor = "#ff2d6a";
            glowRadius = 24;
          } else if (fighter.isBlocking) {
            stateColor = "#00f0ff";
            glowColor = "#00f0ff";
            glowRadius = 20;
          } else if (fighter.charging) {
            stateColor = "#ffb800";
            glowColor = "#ffb800";
            glowRadius = 20;
          } else if (fighter.damageMultiplier > 1) {
            stateColor = "#ff2d6a";
            glowColor = "#ff2d6a";
            glowRadius = 22;
          }

          // Glow aura — changes with state
          const gradient = ctx.createRadialGradient(cx, cy, 4, cx, cy, CELL_SIZE * 0.9);
          gradient.addColorStop(0, glowColor + "55");
          gradient.addColorStop(0.5, glowColor + "22");
          gradient.addColorStop(1, glowColor + "00");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(cx, cy, CELL_SIZE * 0.9, 0, Math.PI * 2);
          ctx.fill();

          // Body
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = glowRadius;

          if (fighter.isStunned) {
            // Stunned: rapid flicker + smaller
            ctx.globalAlpha = 0.3 + Math.random() * 0.4;
            const shrink = 4 + Math.random() * 4;
            ctx.fillStyle = stateColor;
            ctx.fillRect(px + shrink, py + shrink, CELL_SIZE - shrink * 2, CELL_SIZE - shrink * 2);
          } else {
            ctx.fillStyle = stateColor;
            ctx.fillRect(px + 6, py + 6, CELL_SIZE - 12, CELL_SIZE - 12);
          }
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;

          // Inner core — faction color always visible
          if (!fighter.isStunned) {
            ctx.fillStyle = color;
            ctx.fillRect(px + 12, py + 12, CELL_SIZE - 24, CELL_SIZE - 24);
          }

          // Block shield — visible cyan border + icon
          if (fighter.isBlocking) {
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 3;
            // Shield shape (hexagon-ish)
            ctx.beginPath();
            ctx.moveTo(cx, py + 2);
            ctx.lineTo(px + CELL_SIZE - 4, py + 10);
            ctx.lineTo(px + CELL_SIZE - 4, py + CELL_SIZE - 10);
            ctx.lineTo(cx, py + CELL_SIZE - 2);
            ctx.lineTo(px + 4, py + CELL_SIZE - 10);
            ctx.lineTo(px + 4, py + 10);
            ctx.closePath();
            ctx.stroke();
          }

          // Parry stance — bright pulsing cross
          if (fighter.isParrying) {
            const pulse = 0.6 + Math.sin(Date.now() / 80) * 0.4;
            ctx.strokeStyle = `rgba(255, 45, 106, ${pulse})`;
            ctx.lineWidth = 3;
            // X cross
            ctx.beginPath();
            ctx.moveTo(px + 4, py + 4);
            ctx.lineTo(px + CELL_SIZE - 4, py + CELL_SIZE - 4);
            ctx.moveTo(px + CELL_SIZE - 4, py + 4);
            ctx.lineTo(px + 4, py + CELL_SIZE - 4);
            ctx.stroke();
          }

          // Charging indicator — pulsing ring
          if (fighter.charging) {
            const pulse = 0.5 + Math.sin(Date.now() / 100) * 0.5;
            ctx.strokeStyle = `rgba(255, 184, 0, ${pulse})`;
            ctx.lineWidth = 3;
            const chargeRadius = 8 + pulse * 8;
            ctx.beginPath();
            ctx.arc(cx, cy, chargeRadius, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Damage multiplier badge
          if (fighter.damageMultiplier > 1) {
            ctx.fillStyle = "#ff2d6a";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "center";
            ctx.shadowColor = "#ff2d6a";
            ctx.shadowBlur = 8;
            ctx.fillText("2x", cx, py + CELL_SIZE + 14);
            ctx.shadowBlur = 0;
          }

          // HP bar above fighter
          const barWidth = CELL_SIZE - 8;
          const barHeight = 4;
          const barX = px + 4;
          const barY = py - 8;
          const hpRatio = fighter.hp / fighter.maxHp;

          ctx.fillStyle = "#0a0a0f";
          ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
          ctx.fillStyle = hpRatio > 0.5 ? "#39ff14" : hpRatio > 0.25 ? "#ffb800" : "#ff2d6a";
          ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

          // Fighter label
          ctx.fillStyle = color;
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText(fighter.id === "red" ? "P" : "B", cx, py - 12);
        }

        // Projectiles are rendered below in the animation section
      }

      // Projectiles — animated bullets that travel from shooter to target
      const projectiles = projectilesRef.current;
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life++;

        // Lerp position from start to target
        const t = Math.min(1, p.life / (p.maxLife * 0.6)); // arrive at 60% of life
        p.x = p.sx + (p.tx - p.sx) * t;
        p.y = p.sy + (p.ty - p.sy) * t;

        // Save trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();

        const alpha = Math.max(0, 1 - p.life / p.maxLife);

        // Draw trail
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let j = 1; j < p.trail.length; j++) {
            ctx.lineTo(p.trail[j].x, p.trail[j].y);
          }
          ctx.strokeStyle = p.color + Math.floor(alpha * 0.4 * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Draw bullet head
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.hit ? 8 : 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.hit ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Impact flash at arrival
        if (t >= 1 && p.life === Math.ceil(p.maxLife * 0.6)) {
          if (p.hit) {
            // Impact burst
            ctx.fillStyle = p.color + "88";
            ctx.beginPath();
            ctx.arc(p.tx, p.ty, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (p.life >= p.maxLife) {
          projectiles.splice(i, 1);
        }
      }

      // Floating texts
      const texts = floatingTextsRef.current;
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.life++;
        t.y -= 0.4; // float upward slowly

        const alpha = Math.max(0, 1 - t.life / t.maxLife);
        const scale = Math.min(1, t.life / 5); // pop in

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.floor(t.size * scale)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#0a0a0f";
        ctx.fillText(t.text, t.x + 1, t.y + 1); // shadow
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();

        if (t.life >= t.maxLife) {
          texts.splice(i, 1);
        }
      }

      // Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [state]);

  // Fixed dimensions to avoid hydration mismatch (arena is always 10x8)
  const CANVAS_W = 10 * 44 + 3 * 2;  // 446
  const CANVAS_H = 8 * 44 + 3 * 2 + 24; // 382

  return (
    <canvas
      ref={canvasRef}
      className="border border-border-bright rounded-sm"
      style={{
        imageRendering: "pixelated" as const,
        width: `${CANVAS_W}px`,
        height: `${CANVAS_H}px`,
      }}
    />
  );
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

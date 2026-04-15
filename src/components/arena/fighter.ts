import type { Fighter } from "@/lib/types";
import type { FighterCosmetic } from "./types";
import { FACTION_COLORS } from "./types";
import { drawShape, toHex, lerp } from "./math";

// Visual state for smooth interpolation
const visualPositions: Record<string, { x: number; y: number }> = {};

/** Draw a fighter with pseudo-3D volume + animations */
export function drawFighter(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  cosmetic: FighterCosmetic | undefined,
  arenaW: number,
  arenaH: number,
  canvasW: number,
  time: number,
) {
  const id = fighter.id;
  const color = cosmetic?.color || FACTION_COLORS[fighter.faction] || "#ffffff";
  const shape = cosmetic?.shape || "square";

  // Smooth interpolation between grid positions
  if (!visualPositions[id]) {
    visualPositions[id] = { x: fighter.x, y: fighter.y };
  }
  visualPositions[id].x = lerp(visualPositions[id].x, fighter.x, 0.15);
  visualPositions[id].y = lerp(visualPositions[id].y, fighter.y, 0.15);

  const [cx, cy] = toHex(visualPositions[id].x, visualPositions[id].y, arenaW, arenaH, canvasW);

  // Breathing animation
  const breath = Math.sin(time * 0.003) * 0.03;
  const breathY = Math.sin(time * 0.003) * 1.5;
  const baseScale = 1.0 + breath;
  const baseR = 16;

  // State colors
  let stateColor = color;
  let glowColor = color;
  let glowSize = 24;

  if (fighter.isStunned) {
    stateColor = "#ff2d6a";
    glowColor = "#ff2d6a";
    glowSize = 12;
  } else if (fighter.isParrying) {
    stateColor = "#ff2d6a";
    glowColor = "#ff2d6a";
    glowSize = 30;
  } else if (fighter.isBlocking) {
    stateColor = "#00f0ff";
    glowColor = "#00f0ff";
    glowSize = 28;
  } else if (fighter.charging) {
    stateColor = "#ffb800";
    glowColor = "#ffb800";
    glowSize = 28;
  } else if (fighter.damageMultiplier > 1) {
    stateColor = "#ff2d6a";
    glowColor = "#ff2d6a";
    glowSize = 26;
  }

  const drawY = cy + breathY;

  // === LAYER 1: Shadow (floating effect) ===
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000000";
  drawShape(ctx, shape, cx, drawY + 5, baseR * baseScale * 0.8);
  ctx.globalAlpha = 1;

  // === LAYER 2: Glow aura (radial gradient, NO shadowBlur) ===
  const grd = ctx.createRadialGradient(cx, drawY, 2, cx, drawY, glowSize);
  const pulseAlpha = 0.2 + Math.sin(time * 0.004) * 0.1;
  grd.addColorStop(0, glowColor + Math.round(pulseAlpha * 255).toString(16).padStart(2, "0"));
  grd.addColorStop(0.5, glowColor + "22");
  grd.addColorStop(1, glowColor + "00");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, drawY, glowSize, 0, Math.PI * 2);
  ctx.fill();

  // === LAYER 3: Body with vertical gradient (volume) ===
  if (fighter.isStunned) {
    // Glitch effect — offset horizontal randomly
    ctx.globalAlpha = 0.3 + Math.random() * 0.4;
    const glitchX = (Math.random() - 0.5) * 6;
    ctx.fillStyle = stateColor;
    drawShape(ctx, shape, cx + glitchX, drawY, (baseR - 2) * baseScale);
    // Scanlines
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (let sy = -baseR; sy < baseR; sy += 4) {
      ctx.fillRect(cx - baseR, drawY + sy, baseR * 2, 1);
    }
    ctx.globalAlpha = 1;
  } else {
    // Gradient fill for 3D volume look
    const bodyGrd = ctx.createLinearGradient(cx, drawY - baseR, cx, drawY + baseR);
    bodyGrd.addColorStop(0, lighten(stateColor, 30));
    bodyGrd.addColorStop(0.5, stateColor);
    bodyGrd.addColorStop(1, darken(stateColor, 40));
    ctx.fillStyle = bodyGrd;
    drawShape(ctx, shape, cx, drawY, baseR * baseScale);
  }

  // === LAYER 4: Inner highlight (top light) ===
  if (!fighter.isStunned) {
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#ffffff";
    drawShape(ctx, shape, cx, drawY - 2, baseR * 0.6 * baseScale);
    ctx.globalAlpha = 1;
  }

  // === LAYER 5: Border stroke ===
  if (!fighter.isStunned) {
    ctx.strokeStyle = color + "66";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawShape(ctx, shape, cx, drawY, baseR * baseScale);
    ctx.stroke();
  }

  // === State effects ===

  // Block shield — rotating hexagon outline
  if (fighter.isBlocking) {
    const rot = time * 0.001;
    ctx.save();
    ctx.translate(cx, drawY);
    ctx.rotate(rot);
    ctx.strokeStyle = "#00f0ff88";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const r = baseR + 6;
      ctx[i === 0 ? "moveTo" : "lineTo"](r * Math.cos(a), r * Math.sin(a));
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Parry — electric arcs
  if (fighter.isParrying) {
    ctx.strokeStyle = "rgba(255, 45, 106, 0.7)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + time * 0.005;
      const r1 = baseR + 2;
      const r2 = baseR + 8 + Math.random() * 6;
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(angle), drawY + r1 * Math.sin(angle));
      // Jagged mid-point
      const midAngle = angle + (Math.random() - 0.5) * 0.5;
      const midR = (r1 + r2) / 2;
      ctx.lineTo(cx + midR * Math.cos(midAngle), drawY + midR * Math.sin(midAngle));
      ctx.lineTo(cx + r2 * Math.cos(angle), drawY + r2 * Math.sin(angle));
      ctx.stroke();
    }
  }

  // Charging — pulsing ring
  if (fighter.charging) {
    const pulse = 0.5 + Math.sin(time * 0.008) * 0.5;
    ctx.strokeStyle = `rgba(255, 184, 0, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, drawY, baseR + 4 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Damage multiplier badge
  if (fighter.damageMultiplier > 1) {
    ctx.fillStyle = "#ff2d6a";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("2x", cx, drawY + baseR + 14);
  }

  // === HP bar ===
  const hpRatio = fighter.hp / fighter.maxHp;
  const barW = 30;
  const barH = 3;
  const barX = cx - barW / 2;
  const barY = drawY - baseR - 10;

  ctx.fillStyle = "#000000aa";
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

  const hpColor = hpRatio > 0.5 ? "#39ff14" : hpRatio > 0.25 ? "#ffb800" : "#ff2d6a";
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // Label
  ctx.fillStyle = color;
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(fighter.id === "red" ? "P" : "B", cx, barY - 4);
}

/** Reset visual positions (call on new battle) */
export function resetVisualPositions() {
  delete visualPositions["red"];
  delete visualPositions["blue"];
}

// Color utils
function lighten(hex: string, pct: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = pct / 100;
  return `rgb(${Math.min(255, r + (255 - r) * f)}, ${Math.min(255, g + (255 - g) * f)}, ${Math.min(255, b + (255 - b) * f)})`;
}

function darken(hex: string, pct: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - pct / 100;
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
}

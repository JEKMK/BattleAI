import type { Fighter } from "@/lib/types";
import type { FighterCosmetic } from "./types";
import { FACTION_COLORS, FIGHTER_ELEVATION, SHADOW_OFFSET_Y } from "./types";
import { drawShape, toIso, lerp, isoTilePath } from "./math";

const visualPositions: Record<string, { x: number; y: number }> = {};

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  cosmetic: FighterCosmetic | undefined,
  arenaW: number,
  arenaH: number,
  canvasW: number,
  canvasH: number,
  time: number,
) {
  const id = fighter.id;
  const color = cosmetic?.color || FACTION_COLORS[fighter.faction] || "#b44aff";
  const shape = cosmetic?.shape || "square";

  // Smooth position interpolation
  if (!visualPositions[id]) visualPositions[id] = { x: fighter.x, y: fighter.y };
  visualPositions[id].x = lerp(visualPositions[id].x, fighter.x, 0.15);
  visualPositions[id].y = lerp(visualPositions[id].y, fighter.y, 0.15);

  const [cx, cy] = toIso(visualPositions[id].x, visualPositions[id].y, arenaW, arenaH, canvasW, canvasH);

  // Breathing animation
  const breath = Math.sin(time * 0.003) * 0.04;
  const breathY = Math.sin(time * 0.003) * 2;
  const baseScale = 1.0 + breath;
  const baseR = 22; // BIGGER fighters

  // State colors
  let stateColor = color;
  let glowColor = color;
  let glowSize = 36;

  if (fighter.isStunned) { stateColor = "#ff2d6a"; glowColor = "#ff2d6a"; glowSize = 16; }
  else if (fighter.isParrying) { stateColor = "#ff2d6a"; glowColor = "#ff2d6a"; glowSize = 44; }
  else if (fighter.isBlocking) { stateColor = "#00f0ff"; glowColor = "#00f0ff"; glowSize = 40; }
  else if (fighter.charging) { stateColor = "#ffb800"; glowColor = "#ffb800"; glowSize = 40; }
  else if (fighter.damageMultiplier > 1) { stateColor = "#ff2d6a"; glowColor = "#ff2d6a"; glowSize = 38; }

  const drawY = cy - FIGHTER_ELEVATION + breathY;

  // === TILE HIGHLIGHT — illuminate the tile under the fighter ===
  isoTilePath(ctx, cx, cy);
  ctx.fillStyle = glowColor + "25";
  ctx.fill();
  isoTilePath(ctx, cx, cy);
  ctx.strokeStyle = glowColor + "55";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // === SHADOW — ellipse on tile surface ===
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(cx, cy + SHADOW_OFFSET_Y, baseR * 0.8, baseR * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // === OUTER GLOW — BIG and visible ===
  const pulseAlpha = 0.4 + Math.sin(time * 0.004) * 0.2;
  const grd = ctx.createRadialGradient(cx, drawY, 4, cx, drawY, glowSize);
  grd.addColorStop(0, glowColor + hexAlpha(pulseAlpha));
  grd.addColorStop(0.4, glowColor + hexAlpha(pulseAlpha * 0.4));
  grd.addColorStop(1, glowColor + "00");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, drawY, glowSize, 0, Math.PI * 2);
  ctx.fill();

  // === BODY ===
  if (fighter.isStunned) {
    ctx.globalAlpha = 0.3 + Math.random() * 0.4;
    const glitchX = (Math.random() - 0.5) * 8;
    ctx.fillStyle = stateColor;
    drawShape(ctx, shape, cx + glitchX, drawY, (baseR - 2) * baseScale);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    for (let sy = -baseR; sy < baseR; sy += 3) {
      ctx.fillRect(cx - baseR - 5, drawY + sy, baseR * 2 + 10, 1);
    }
    ctx.globalAlpha = 1;
  } else {
    // Fighters draw UPRIGHT — like sprites in Diablo/Hades.
    // No rotation, no squash. Only the shadow is iso-projected.

    // Body gradient — color dominant
    const bodyGrd = ctx.createLinearGradient(cx, drawY - baseR, cx, drawY + baseR);
    bodyGrd.addColorStop(0, lighten(stateColor, 20));
    bodyGrd.addColorStop(0.35, stateColor);
    bodyGrd.addColorStop(1, darken(stateColor, 40));
    ctx.fillStyle = bodyGrd;
    drawShape(ctx, shape, cx, drawY, baseR * baseScale);

    // Inner core — bright center glow
    const coreGrd = ctx.createRadialGradient(cx, drawY - 3, 0, cx, drawY, baseR * 0.6);
    coreGrd.addColorStop(0, "rgba(255,255,255,0.3)");
    coreGrd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = coreGrd;
    drawShape(ctx, shape, cx, drawY, baseR * 0.65 * baseScale);

    // Bright border stroke — makes shape POP
    ctx.strokeStyle = lighten(stateColor, 35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawShape(ctx, shape, cx, drawY, baseR * baseScale);
    ctx.stroke();
  }

  // === STATE EFFECTS ===

  if (fighter.isBlocking) {
    const rot = time * 0.002;
    ctx.save();
    ctx.translate(cx, drawY);
    ctx.rotate(rot);
    ctx.strokeStyle = "#00f0ffcc";
    ctx.lineWidth = 2.5;
    isoTilePath(ctx, 0, 0, baseR * 2.4, baseR * 1.2);
    ctx.stroke();
    ctx.restore();
  }

  if (fighter.isParrying) {
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i + time * 0.006;
      const r1 = baseR + 4;
      const r2 = baseR + 12 + Math.random() * 10;
      const alpha = 0.5 + Math.random() * 0.5;
      ctx.strokeStyle = `rgba(255, 45, 106, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(angle), drawY + r1 * Math.sin(angle) * 0.5);
      const midA = angle + (Math.random() - 0.5) * 0.7;
      const midR = (r1 + r2) / 2;
      ctx.lineTo(cx + midR * Math.cos(midA), drawY + midR * Math.sin(midA) * 0.5);
      ctx.lineTo(cx + r2 * Math.cos(angle), drawY + r2 * Math.sin(angle) * 0.5);
      ctx.stroke();
    }
  }

  if (fighter.charging) {
    const p = 0.5 + Math.sin(time * 0.008) * 0.5;
    ctx.strokeStyle = `rgba(255, 184, 0, ${p})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, drawY, baseR + 6 + p * 10, (baseR + 6 + p * 10) * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (fighter.damageMultiplier > 1) {
    ctx.fillStyle = "#ff2d6a";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("2x", cx, drawY + baseR + 18);
  }

  // === HP BAR ===
  const hpRatio = fighter.hp / fighter.maxHp;
  const barW = 36;
  const barH = 4;
  const barX = cx - barW / 2;
  const barY = drawY - baseR - 14;

  ctx.fillStyle = "#000000cc";
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  const hpColor = hpRatio > 0.5 ? "#39ff14" : hpRatio > 0.25 ? "#ffb800" : "#ff2d6a";
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // Label
  ctx.fillStyle = color;
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(fighter.id === "red" ? "P" : "B", cx, barY - 6);
}

export function resetVisualPositions() {
  delete visualPositions["red"];
  delete visualPositions["blue"];
}

function hexAlpha(a: number): string {
  return Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, "0");
}

function lighten(hex: string, pct: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = pct / 100;
  return `#${Math.min(255, Math.round(r + (255 - r) * f)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(g + (255 - g) * f)).toString(16).padStart(2, "0")}${Math.min(255, Math.round(b + (255 - b) * f)).toString(16).padStart(2, "0")}`;
}

function darken(hex: string, pct: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = 1 - pct / 100;
  return `#${Math.round(r * f).toString(16).padStart(2, "0")}${Math.round(g * f).toString(16).padStart(2, "0")}${Math.round(b * f).toString(16).padStart(2, "0")}`;
}

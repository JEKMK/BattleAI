import type { RunnerShape } from "@/lib/types";
import { TILE_W, TILE_H, PADDING, TOP_OFFSET } from "./types";

/**
 * Isometric projection: convert grid (x, y) to screen pixel coords.
 *
 * Standard isometric: rotate 45° then squash Y by 50%.
 *   screenX = (gridX - gridY) * tileW/2
 *   screenY = (gridX + gridY) * tileH/2
 *
 * This makes the grid look like a diamond viewed from ~30° angle.
 */
export function toIso(
  gridX: number,
  gridY: number,
  arenaW: number,
  arenaH: number,
  canvasW: number,
  canvasH: number,
): [number, number] {
  // Center the iso grid in the canvas
  const centerX = canvasW / 2;
  const centerY = TOP_OFFSET + (arenaH * TILE_H) / 2 + PADDING;

  const isoX = (gridX - gridY) * (TILE_W / 2) + centerX;
  const isoY = (gridX + gridY) * (TILE_H / 2) + centerY - (arenaW * TILE_H) / 2;

  return [isoX, isoY];
}

/**
 * Draw an isometric diamond tile (flat rhombus) centered at (cx, cy).
 * This is the standard iso tile shape.
 */
export function isoTilePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, w = TILE_W, h = TILE_H) {
  const hw = w / 2;
  const hh = h / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);      // top
  ctx.lineTo(cx + hw, cy);      // right
  ctx.lineTo(cx, cy + hh);      // bottom
  ctx.lineTo(cx - hw, cy);      // left
  ctx.closePath();
}

/** Draw geometric shape centered at (cx, cy) with given radius */
export function drawShape(ctx: CanvasRenderingContext2D, shape: RunnerShape, cx: number, cy: number, r: number) {
  ctx.beginPath();
  switch (shape) {
    case "diamond":
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      break;
    case "triangle":
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.87, cy + r * 0.5);
      ctx.lineTo(cx - r * 0.87, cy + r * 0.5);
      break;
    case "hexagon":
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        ctx[i === 0 ? "moveTo" : "lineTo"](cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      break;
    case "pentagon":
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        ctx[i === 0 ? "moveTo" : "lineTo"](cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      break;
    case "star": {
      const inner = r * 0.4;
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : inner;
        ctx[i === 0 ? "moveTo" : "lineTo"](cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      }
      break;
    }
    case "cross":
      ctx.moveTo(cx - r * 0.3, cy - r);
      ctx.lineTo(cx + r * 0.3, cy - r);
      ctx.lineTo(cx + r * 0.3, cy - r * 0.3);
      ctx.lineTo(cx + r, cy - r * 0.3);
      ctx.lineTo(cx + r, cy + r * 0.3);
      ctx.lineTo(cx + r * 0.3, cy + r * 0.3);
      ctx.lineTo(cx + r * 0.3, cy + r);
      ctx.lineTo(cx - r * 0.3, cy + r);
      ctx.lineTo(cx - r * 0.3, cy + r * 0.3);
      ctx.lineTo(cx - r, cy + r * 0.3);
      ctx.lineTo(cx - r, cy - r * 0.3);
      ctx.lineTo(cx - r * 0.3, cy - r * 0.3);
      break;
    case "circle":
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case "square":
    default:
      // Square renders as diamond in iso (rotated 45°)
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Canvas dimensions for a given arena size in isometric projection */
export function getCanvasDimensions(arenaW: number, arenaH: number) {
  // Iso diamond: total width = (arenaW + arenaH) * TILE_W/2
  // total height = (arenaW + arenaH) * TILE_H/2
  const isoW = (arenaW + arenaH) * (TILE_W / 2) + PADDING * 2;
  const isoH = (arenaW + arenaH) * (TILE_H / 2) + TOP_OFFSET + PADDING * 2 + 30; // extra for labels/text
  return { width: Math.ceil(isoW), height: Math.ceil(isoH) };
}

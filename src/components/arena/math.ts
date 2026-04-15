import type { RunnerShape } from "@/lib/types";
import { HEX_W, HEX_H, HEX_OVERLAP, PADDING, TOP_OFFSET } from "./types";

/** Convert grid (x, y) to screen pixel coords (center of hex) */
export function toHex(gridX: number, gridY: number, arenaW: number, arenaH: number, canvasW: number): [number, number] {
  const gridPixelW = arenaW * HEX_W;
  const gridPixelH = arenaH * (HEX_H * HEX_OVERLAP) + HEX_H * (1 - HEX_OVERLAP);
  const offsetX = (canvasW - gridPixelW) / 2;
  const rowOffset = gridY % 2 === 1 ? HEX_W / 2 : 0;
  const sx = gridX * HEX_W + rowOffset + offsetX + HEX_W / 2;
  const sy = gridY * (HEX_H * HEX_OVERLAP) + PADDING + TOP_OFFSET + HEX_H / 2;
  return [sx, sy];
}

/** Draw a flat-top hexagon path centered at (cx, cy) */
export function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r?: number) {
  const radius = r ?? HEX_H / 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i; // flat-top: start at 0°
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
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
      ctx.rect(cx - r, cy - r, r * 2, r * 2);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

/** Draw shape as stroke only */
export function strokeShape(ctx: CanvasRenderingContext2D, shape: RunnerShape, cx: number, cy: number, r: number) {
  ctx.beginPath();
  // Same path as drawShape but stroke instead of fill
  drawShape(ctx, shape, cx, cy, r);
  ctx.stroke();
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Canvas dimensions for a given arena size */
export function getCanvasDimensions(arenaW: number, arenaH: number) {
  const w = Math.max(arenaW * HEX_W + PADDING * 2, 500);
  const h = arenaH * (HEX_H * HEX_OVERLAP) + HEX_H * (1 - HEX_OVERLAP) + TOP_OFFSET + PADDING * 2;
  return { width: Math.ceil(w), height: Math.ceil(h) };
}

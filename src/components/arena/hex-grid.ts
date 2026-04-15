import { HEX_W, HEX_H, HEX_OVERLAP, PADDING, TOP_OFFSET } from "./types";
import { hexPath, toHex } from "./math";
import type { DataRainColumn } from "./types";

/** Draw hex grid with energy pulse + firewall zones */
export function drawHexGrid(
  ctx: CanvasRenderingContext2D,
  arenaW: number,
  arenaH: number,
  canvasW: number,
  time: number,
  bounds?: { minX: number; minY: number; maxX: number; maxY: number },
) {
  // Data rain background (subtle)
  drawDataRain(ctx, canvasW, ctx.canvas.height, time);

  for (let y = 0; y < arenaH; y++) {
    for (let x = 0; x < arenaW; x++) {
      const [cx, cy] = toHex(x, y, arenaW, arenaH, canvasW);

      // Energy pulse — wave travels across grid
      const pulse = 0.08 + 0.1 * Math.sin((x * 0.7 + y * 0.5 + time * 0.002) * 0.8);

      // Check if outside bounds (firewall zone)
      const outOfBounds = bounds && (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY);

      // Hex fill
      hexPath(ctx, cx, cy);
      if (outOfBounds) {
        ctx.fillStyle = `rgba(255, 45, 106, ${0.08 + pulse * 0.5})`;
      } else {
        ctx.fillStyle = `rgba(0, 240, 255, ${pulse * 0.3})`;
      }
      ctx.fill();

      // Hex border
      hexPath(ctx, cx, cy);
      if (outOfBounds) {
        ctx.strokeStyle = `rgba(255, 45, 106, ${0.15 + pulse})`;
      } else {
        ctx.strokeStyle = `rgba(0, 240, 255, ${pulse})`;
      }
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  // Firewall border — dashed line around active bounds
  if (bounds && (bounds.minX > 0 || bounds.minY > 0 || bounds.maxX < arenaW - 1 || bounds.maxY < arenaH - 1)) {
    const [tlx, tly] = toHex(bounds.minX, bounds.minY, arenaW, arenaH, canvasW);
    const [brx, bry] = toHex(bounds.maxX, bounds.maxY, arenaW, arenaH, canvasW);
    ctx.strokeStyle = "rgba(255, 45, 106, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(
      tlx - HEX_W / 2 - 2,
      tly - HEX_H / 2 - 2,
      brx - tlx + HEX_W + 4,
      bry - tly + HEX_H + 4,
    );
    ctx.setLineDash([]);
  }

  // Vignette
  const grd = ctx.createRadialGradient(canvasW / 2, ctx.canvas.height / 2, canvasW * 0.3, canvasW / 2, ctx.canvas.height / 2, canvasW * 0.7);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvasW, ctx.canvas.height);
}

// Data rain state (persists across frames)
const dataColumns: DataRainColumn[] = [];

function drawDataRain(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  if (dataColumns.length === 0) {
    const chars = "01アカサタナハマヤラワ∞∅⊕⊗".split("");
    for (let i = 0; i < 6; i++) {
      const col: string[] = [];
      for (let j = 0; j < 12; j++) col.push(chars[Math.floor(Math.random() * chars.length)]);
      dataColumns.push({ x: 40 + (w - 80) * (i / 5), chars: col, speed: 0.3 + Math.random() * 0.5, offset: Math.random() * h });
    }
  }

  ctx.font = "10px monospace";
  for (const col of dataColumns) {
    col.offset = (col.offset + col.speed) % (h + 200);
    for (let j = 0; j < col.chars.length; j++) {
      const y = col.offset + j * 16 - 100;
      if (y < 0 || y > h) continue;
      const fade = 1 - j / col.chars.length;
      ctx.fillStyle = `rgba(0, 240, 255, ${fade * 0.06})`;
      ctx.fillText(col.chars[j], col.x, y);
    }
    // Randomly change a character
    if (Math.random() < 0.02) {
      const idx = Math.floor(Math.random() * col.chars.length);
      const chars = "01アカサタナハマヤラワ∞∅⊕⊗";
      col.chars[idx] = chars[Math.floor(Math.random() * chars.length)];
    }
  }
}

/** Glow a hex tile at grid position */
export function glowHex(
  ctx: CanvasRenderingContext2D,
  gridX: number,
  gridY: number,
  arenaW: number,
  arenaH: number,
  canvasW: number,
  color: string,
  alpha: number,
) {
  const [cx, cy] = toHex(gridX, gridY, arenaW, arenaH, canvasW);
  hexPath(ctx, cx, cy);
  ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, "0");
  ctx.fill();
}

import type { DataRainColumn } from "./types";
import { isoTilePath, toIso } from "./math";

/** Draw isometric diamond grid with energy pulse + firewall */
export function drawHexGrid(
  ctx: CanvasRenderingContext2D,
  arenaW: number,
  arenaH: number,
  canvasW: number,
  canvasH: number,
  time: number,
  bounds?: { minX: number; minY: number; maxX: number; maxY: number },
) {
  // Data rain background first (behind everything)
  drawDataRain(ctx, canvasW, canvasH, time);

  // Draw tiles back-to-front (top-left to bottom-right in iso)
  for (let y = 0; y < arenaH; y++) {
    for (let x = 0; x < arenaW; x++) {
      const [cx, cy] = toIso(x, y, arenaW, arenaH, canvasW, canvasH);

      // Energy pulse wave
      const pulse = 0.12 + 0.18 * Math.sin((x * 0.7 + y * 0.5 + time * 0.002) * 0.8);

      const outOfBounds = bounds && (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY);

      // Tile fill
      isoTilePath(ctx, cx, cy);
      if (outOfBounds) {
        ctx.fillStyle = `rgba(255, 45, 106, ${0.06 + pulse * 0.3})`;
      } else {
        ctx.fillStyle = `rgba(0, 240, 255, ${pulse * 0.08})`;
      }
      ctx.fill();

      // Tile border — the main visual element
      isoTilePath(ctx, cx, cy);
      if (outOfBounds) {
        ctx.strokeStyle = `rgba(255, 45, 106, ${0.2 + pulse * 0.8})`;
      } else {
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 + pulse * 1.0})`;
      }
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Corner dots at tile vertices for extra grid feel
      // Vertex dots — brighter at intersections
      if (!outOfBounds) {
        ctx.fillStyle = `rgba(0, 240, 255, ${0.15 + pulse * 0.6})`;
        ctx.fillRect(cx - 1, cy - 1, 2, 2);
      }
    }
  }

  // Firewall border
  if (bounds && (bounds.minX > 0 || bounds.minY > 0 || bounds.maxX < arenaW - 1 || bounds.maxY < arenaH - 1)) {
    // Draw dashed border around active bounds in iso space
    const corners = [
      toIso(bounds.minX, bounds.minY, arenaW, arenaH, canvasW, canvasH),
      toIso(bounds.maxX + 1, bounds.minY, arenaW, arenaH, canvasW, canvasH),
      toIso(bounds.maxX + 1, bounds.maxY + 1, arenaW, arenaH, canvasW, canvasH),
      toIso(bounds.minX, bounds.maxY + 1, arenaW, arenaH, canvasW, canvasH),
    ];
    ctx.strokeStyle = "rgba(255, 45, 106, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i][0], corners[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Vignette — radial dark edges
  const grd = ctx.createRadialGradient(canvasW / 2, canvasH / 2, Math.min(canvasW, canvasH) * 0.3, canvasW / 2, canvasH / 2, Math.max(canvasW, canvasH) * 0.6);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

// Persistent data rain columns
const dataColumns: DataRainColumn[] = [];

function drawDataRain(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  if (dataColumns.length === 0) {
    const chars = "01アカサタナハマヤラワ∞∅⊕⊗".split("");
    for (let i = 0; i < 8; i++) {
      const col: string[] = [];
      for (let j = 0; j < 15; j++) col.push(chars[Math.floor(Math.random() * chars.length)]);
      dataColumns.push({
        x: 30 + (w - 60) * (i / 7),
        chars: col,
        speed: 0.2 + Math.random() * 0.4,
        offset: Math.random() * h,
      });
    }
  }

  ctx.font = "10px monospace";
  for (const col of dataColumns) {
    col.offset = (col.offset + col.speed) % (h + 250);
    for (let j = 0; j < col.chars.length; j++) {
      const y = col.offset + j * 16 - 120;
      if (y < -10 || y > h + 10) continue;
      const fade = 1 - j / col.chars.length;
      ctx.fillStyle = `rgba(0, 240, 255, ${fade * 0.1})`;
      ctx.fillText(col.chars[j], col.x, y);
    }
    if (Math.random() < 0.02) {
      const idx = Math.floor(Math.random() * col.chars.length);
      const all = "01アカサタナハマヤラワ∞∅⊕⊗";
      col.chars[idx] = all[Math.floor(Math.random() * all.length)];
    }
  }
}

/** Glow an iso tile at grid position */
export function glowTile(
  ctx: CanvasRenderingContext2D,
  gridX: number,
  gridY: number,
  arenaW: number,
  arenaH: number,
  canvasW: number,
  canvasH: number,
  color: string,
  alpha: number,
) {
  const [cx, cy] = toIso(gridX, gridY, arenaW, arenaH, canvasW, canvasH);
  isoTilePath(ctx, cx, cy);
  ctx.fillStyle = color + Math.round(Math.min(1, alpha) * 255).toString(16).padStart(2, "0");
  ctx.fill();
}

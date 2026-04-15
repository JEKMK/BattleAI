import type { Projectile } from "./types";

export function spawnProjectile(
  projectiles: Projectile[],
  sx: number, sy: number,
  tx: number, ty: number,
  color: string,
  hit: boolean,
) {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const travelFrames = Math.max(20, dist * 0.15);

  projectiles.push({
    sx, sy, tx, ty,
    x: sx, y: sy,
    color,
    hit,
    life: 0,
    maxLife: travelFrames + 12,
    trail: [],
  });
}

export function updateAndDrawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life++;

    const travelFrames = p.maxLife - 12;
    const t = Math.min(1, p.life / travelFrames);
    const eased = 1 - (1 - t) * (1 - t); // ease-out

    p.x = p.sx + (p.tx - p.sx) * eased;
    p.y = p.sy + (p.ty - p.sy) * eased;

    // Trail
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 14) p.trail.shift();

    const alpha = p.life >= travelFrames ? Math.max(0, 1 - (p.life - travelFrames) / 12) : 1;
    if (alpha <= 0) {
      projectiles.splice(i, 1);
      continue;
    }

    const dx = p.tx - p.sx;
    const dy = p.ty - p.sy;
    const angle = Math.atan2(dy, dx);

    // === Main beam — segmented dashes ===
    if (p.life <= travelFrames + 4) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      for (let s = 0; s < 4; s++) {
        const segAlpha = alpha * (1 - s * 0.2);
        ctx.fillStyle = p.color + Math.round(segAlpha * 255).toString(16).padStart(2, "0");
        const w = s === 0 ? 6 : 4;
        const h = s === 0 ? 3 : 2;
        ctx.fillRect(-s * 8 - w, -h / 2, w, h);
      }
      ctx.restore();
    }

    // === Electric trail — jagged lines around beam ===
    if (p.life <= travelFrames && p.trail.length > 2) {
      ctx.strokeStyle = p.color + "44";
      ctx.lineWidth = 0.8;
      for (let e = 0; e < 2; e++) {
        ctx.beginPath();
        for (let j = Math.max(0, p.trail.length - 8); j < p.trail.length; j++) {
          const pt = p.trail[j];
          const offsetX = (Math.random() - 0.5) * 8;
          const offsetY = (Math.random() - 0.5) * 8;
          if (j === Math.max(0, p.trail.length - 8)) ctx.moveTo(pt.x + offsetX, pt.y + offsetY);
          else ctx.lineTo(pt.x + offsetX, pt.y + offsetY);
        }
        ctx.stroke();
      }
    }

    // === Glow line along trail ===
    if (p.trail.length > 1) {
      ctx.strokeStyle = p.color + Math.round(alpha * 0.12 * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let j = 1; j < p.trail.length; j++) {
        ctx.lineTo(p.trail[j].x, p.trail[j].y);
      }
      ctx.stroke();
    }

    // === Impact effects ===
    if (p.life >= travelFrames) {
      const impactT = (p.life - travelFrames) / 12;
      if (p.hit) {
        // Expanding ring
        ctx.strokeStyle = p.color + Math.round((1 - impactT) * 200).toString(16).padStart(2, "0");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.tx, p.ty, 4 + impactT * 18, 0, Math.PI * 2);
        ctx.stroke();
        // White core flash (first 3 frames)
        if (p.life - travelFrames < 3) {
          ctx.fillStyle = `rgba(255,255,255,${0.6 - impactT * 2})`;
          ctx.beginPath();
          ctx.arc(p.tx, p.ty, 5 - impactT * 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Miss fizzle
        for (let f = 0; f < 3; f++) {
          ctx.fillStyle = p.color + Math.round((1 - impactT) * 120).toString(16).padStart(2, "0");
          ctx.fillRect(p.tx + (Math.random() - 0.5) * 16, p.ty + (Math.random() - 0.5) * 16, 2, 2);
        }
      }
    }
  }
}

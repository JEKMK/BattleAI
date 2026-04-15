import type { Particle } from "./types";

export function spawnParticles(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  count: number,
  isFragment = false,
) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - (isFragment ? 1 : 0), // fragments float up slightly
      life: 0,
      maxLife: 15 + Math.random() * 20,
      color,
      size: isFragment ? 3 + Math.random() * 4 : 1.5 + Math.random() * 3,
      rotation: isFragment ? Math.random() * Math.PI * 2 : undefined,
      isFragment,
    });
  }
}

export function updateAndDrawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life++;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.94;
    p.vy *= 0.94;
    if (p.isFragment && p.rotation != null) p.rotation += 0.1;

    const alpha = Math.max(0, 1 - p.life / p.maxLife);
    if (alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const hexAlpha = Math.round(alpha * 255).toString(16).padStart(2, "0");

    if (p.isFragment) {
      // Data fragment — rotated rectangle
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation ?? 0);
      ctx.fillStyle = p.color + hexAlpha;
      ctx.fillRect(-p.size / 2, -1.5, p.size, 3);
      ctx.restore();
    } else {
      // Regular particle — square
      ctx.fillStyle = p.color + hexAlpha;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
}

import type { ScreenShake } from "./types";

// Screen shake state (shared)
export const shake: ScreenShake = { intensity: 0, x: 0, y: 0 };

export function triggerShake(intensity: number) {
  shake.intensity = intensity;
}

export function updateShake(canvas: HTMLCanvasElement) {
  if (shake.intensity > 0.5) {
    shake.x = (Math.random() - 0.5) * shake.intensity;
    shake.y = (Math.random() - 0.5) * shake.intensity;
    shake.intensity *= 0.85;
    canvas.style.transform = `translate(${shake.x}px, ${shake.y}px)`;
  } else {
    shake.intensity = 0;
    shake.x = 0;
    shake.y = 0;
    canvas.style.transform = "";
  }
}

/** Draw shockwave ring expanding from center */
export function drawShockwave(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  maxFrames: number,
  color: string,
) {
  const t = frame / maxFrames;
  if (t >= 1) return;
  const radius = 5 + t * 40;
  const alpha = 1 - t;
  ctx.strokeStyle = color + Math.round(alpha * 180).toString(16).padStart(2, "0");
  ctx.lineWidth = 2 - t;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

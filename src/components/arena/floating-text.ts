import type { FloatingText } from "./types";
import { TYPE_COLORS } from "./types";

/** Shorten log message to compact floating text */
export function shortenMessage(msg: string, type: string): string {
  const dmgMatch = msg.match(/-(\d+)/);
  const dmg = dmgMatch ? dmgMatch[1] : null;

  if (type === "hit") {
    if (msg.includes("MEGA")) return `MEGA -${dmg}!!`;
    if (msg.includes("COMBO") && msg.includes("Hammer")) return `COMBO -${dmg}!`;
    if (msg.includes("COMBO")) return `COMBO -${dmg}!`;
    if (msg.includes("Hammer")) return `HAMMER -${dmg}!`;
    if (msg.includes("Spike")) return `SPIKE -${dmg}`;
    if (msg.includes("Burn") && msg.includes("shield")) return `WALL -${dmg}`;
    if (msg.includes("Burn")) return `BURN -${dmg}`;
    return dmg ? `-${dmg}` : msg.slice(0, 12);
  }
  if (type === "miss") {
    if (msg.includes("deflected") || msg.includes("firewall")) return "BLOCKED";
    if (msg.includes("phased") || msg.includes("ghost") || msg.includes("shifted")) return "DODGED";
    if (msg.includes("fizzles") || msg.includes("whiff")) return "WHIFF";
    if (msg.includes("too far") || msg.includes("max range") || msg.includes("dissipate")) return "TOO FAR";
    return "MISS";
  }
  if (type === "block") return "SHIELD";
  if (type === "dodge") return "GHOST";
  if (type === "parry") return msg.includes("triggers") || msg.includes("reflects") || msg.includes("counter") ? "BLACK ICE!" : "B.ICE";
  if (type === "stun") return "STUNNED";
  if (type === "ko") return "FLATLINED";
  if (type === "heal") return msg.match(/\+\d+/)?.[0] ?? "+1 HP";
  if (type === "system") return "";
  return msg.slice(0, 12);
}

export function spawnFloatingText(
  texts: FloatingText[],
  x: number,
  y: number,
  text: string,
  color: string,
  size = 14,
) {
  if (!text) return;
  texts.push({ x, y: y - 8, text, color, life: 0, maxLife: 70, size });
}

export function updateAndDrawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life++;
    t.y -= 0.4; // float upward

    const alpha = Math.max(0, 1 - t.life / t.maxLife);
    if (alpha <= 0) {
      texts.splice(i, 1);
      continue;
    }

    const popIn = Math.min(1, t.life / 5);
    const size = t.size * popIn;

    ctx.font = `bold ${Math.round(size)}px monospace`;
    ctx.textAlign = "center";

    // Shadow
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
    ctx.fillText(t.text, t.x + 1, t.y + 1);

    // Colored text
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  }
}

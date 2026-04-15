import type { RunnerShape } from "@/lib/types";

export interface FighterCosmetic {
  shape: RunnerShape;
  color: string;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  rotation?: number;
  isFragment?: boolean;
}

export interface Projectile {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  color: string;
  hit: boolean;
  life: number;
  maxLife: number;
  trail: { x: number; y: number }[];
}

export interface ScreenShake {
  intensity: number;
  x: number;
  y: number;
}

export interface DataRainColumn {
  x: number;
  chars: string[];
  speed: number;
  offset: number;
}

// Isometric tile dimensions
// Standard iso ratio: width = 2 * height
export const TILE_W = 64;          // horizontal span of one iso tile
export const TILE_H = 32;          // vertical span (half of width = iso standard)
export const PADDING = 20;
export const TOP_OFFSET = 30;      // space above grid
export const FIGHTER_ELEVATION = 18; // fighters "float" above tile — more = more 3D
export const SHADOW_OFFSET_Y = 8;   // shadow below on the tile surface

export const FACTION_COLORS: Record<string, string> = {
  anthropic: "#b44aff",
  google: "#00f0ff",
  openai: "#39ff14",
};

export const TYPE_COLORS: Record<string, string> = {
  hit: "#ffb800",
  miss: "#4a4a5e",
  block: "#00f0ff",
  dodge: "#00f0ff",
  parry: "#ff2d6a",
  stun: "#ff2d6a",
  attack: "#ffb800",
  ko: "#ff2d6a",
  heal: "#39ff14",
  system: "#ffb800",
  move: "#4a4a5e88",
};

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
  isFragment?: boolean; // data fragment (rectangle instead of square)
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

// Hex grid constants
export const HEX_W = 52;
export const HEX_H = 46;
export const HEX_OVERLAP = 0.75;
export const PADDING = 10;
export const TOP_OFFSET = 24; // space above grid for labels

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

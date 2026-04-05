export type Faction = "anthropic" | "google" | "openai";

export type Direction = "up" | "down" | "left" | "right" | "none";

export type ActionType =
  | "punch"    // 1 tile range, 2 dmg
  | "shoot"    // 3 tile range, 1 dmg
  | "heavy"    // 1 tile range, 3 dmg, 2 tick charge
  | "block"    // reduce 50% frontal dmg
  | "dodge"    // invulnerable 1 tick, cooldown 4
  | "parry"    // if enemy attacks this tick, stun them + next attack is 2x
  | "none";

export interface FighterAction {
  move: Direction;
  action: ActionType;
}

export interface Fighter {
  id: "red" | "blue";
  name: string;
  faction: Faction;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: Direction;
  cooldowns: {
    dash: number;
    dodge: number;
    heavy: number;
    parry: number;
  };
  charging: ActionType | null; // if charging heavy
  isInvulnerable: boolean;
  isBlocking: boolean;
  isParrying: boolean;
  isStunned: boolean;
  damageMultiplier: number; // 2x after successful parry
}

export interface GameState {
  tick: number;
  arena: { width: number; height: number };
  /** Active playable bounds — shrinks over time */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  fighters: [Fighter, Fighter];
  status: "fighting" | "ko" | "timeout";
  winner: "red" | "blue" | "draw" | null;
  log: LogEntry[];
}

export interface LogEntry {
  tick: number;
  fighter: "red" | "blue";
  type: "move" | "attack" | "hit" | "miss" | "block" | "dodge" | "parry" | "stun" | "ko" | "system";
  message: string;
  // For floating text rendering
  x?: number;
  y?: number;
}

export interface TickInput {
  tick: number;
  you: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    facing: Direction;
    cooldowns: { dash: number; dodge: number; heavy: number; parry: number };
    isBlocking: boolean;
    isStunned: boolean;
    charging: string | null;
  };
  enemy: {
    x: number;
    y: number;
    hp: number;
    facing: Direction;
    isBlocking: boolean;
    isStunned: boolean;
    charging: string | null;
  };
  arena: { width: number; height: number };
  history: LogEntry[];
}

export interface BattleConfig {
  arenaWidth: number;
  arenaHeight: number;
  maxTicks: number;
  tickDurationMs: number;
  maxHp: number;
}

export const DEFAULT_CONFIG: BattleConfig = {
  arenaWidth: 10,
  arenaHeight: 8,
  maxTicks: 120, // 60 seconds at 2 ticks/sec
  tickDurationMs: 500,
  maxHp: 10,
};

export const FACTION_META: Record<Faction, {
  label: string;
  model: string;
  color: string;
  glow: string;
}> = {
  anthropic: {
    label: "ANTHROPIC",
    model: "anthropic/claude-haiku-4.5",
    color: "var(--faction-anthropic)",
    glow: "var(--glow-purple)",
  },
  google: {
    label: "GOOGLE",
    model: "google/gemini-2.0-flash",
    color: "var(--faction-google)",
    glow: "var(--glow-cyan)",
  },
  openai: {
    label: "OPENAI",
    model: "openai/gpt-4o-mini",
    color: "var(--faction-openai)",
    glow: "var(--glow-green)",
  },
};

// Bot presets
export const BOT_PROMPTS: Record<string, { name: string; prompt: string }> = {
  aggressive: {
    name: "BRUISER",
    prompt: `You are an aggressive close-combat fighter. Always move toward the enemy. When adjacent, use punch repeatedly. If you land 2 punches, follow with a heavy attack. Never block, never retreat. Aggression wins.`,
  },
  defensive: {
    name: "SENTINEL",
    prompt: `You are a defensive sniper. Keep maximum distance from the enemy. Use shoot whenever in range. If the enemy gets close, dodge and reposition. Block when you can't escape. Never engage in melee voluntarily.`,
  },
  balanced: {
    name: "GHOST",
    prompt: `You are a tactical fighter. At range, shoot. Close in when enemy HP is low. Use dodge to avoid heavy attacks. Mix punch and heavy attacks in melee. Block when enemy is charging. Adapt to the situation.`,
  },
};

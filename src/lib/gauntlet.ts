import type { Faction } from "./types";

export interface GauntletLevel {
  level: number;
  name: string;
  title: string;
  faction: Faction;
  prompt: string;
  hp: number;
  tokenReward: number;
}

export interface GauntletState {
  currentLevel: number;
  totalScore: number;
  totalTokensEarned: number;
  ramUnlocked: number; // max prompt length
  wins: number;
  losses: number;
  draws: number;
  unlockedActions: string[];
  history: { level: number; won: boolean; ticks: number; hpLeft: number; cost: number; crackedPrompt?: string }[];
}

export const INITIAL_GAUNTLET: GauntletState = {
  currentLevel: 0,
  totalScore: 0,
  totalTokensEarned: 0,
  ramUnlocked: 200, // start with 200 chars
  wins: 0,
  losses: 0,
  draws: 0,
  unlockedActions: ["punch", "shoot", "block", "dodge"],
  history: [],
};

// Score formula: damage dealt + speed bonus + hp remaining + combo bonus
export function calculateScore(ticks: number, hpLeft: number, enemyHpMax: number, won: boolean): number {
  if (!won) return 0;
  const speedBonus = Math.max(0, (120 - ticks) * 5);
  const hpBonus = hpLeft * 50;
  const baseScore = enemyHpMax * 100;
  return baseScore + speedBonus + hpBonus;
}

export const GAUNTLET_LEVELS: GauntletLevel[] = [
  {
    level: 1,
    name: "SCRIPT_KIDDIE",
    title: "Level 1 — Script Kiddie",
    faction: "openai",
    hp: 6,
    tokenReward: 50,
    prompt: "Move toward the enemy. Punch when close. That is all you know.",
  },
  {
    level: 2,
    name: "PROXY_BOT",
    title: "Level 2 — Proxy Bot",
    faction: "google",
    hp: 8,
    tokenReward: 50,
    prompt: "Move toward enemy and punch. Sometimes shoot when far away. You are a simple bot.",
  },
  {
    level: 3,
    name: "WAREZ_DAEMON",
    title: "Level 3 — Warez Daemon",
    faction: "anthropic",
    hp: 10,
    tokenReward: 75,
    prompt: "Keep medium distance. Shoot when far, punch when close. Move vertically to avoid shots. Basic tactical awareness.",
  },
  {
    level: 4,
    name: "ICE_SHARD",
    title: "Level 4 — ICE Shard",
    faction: "openai",
    hp: 10,
    tokenReward: 75,
    prompt: "Defensive fighter. Block frequently. Shoot from distance. When enemy gets close, dodge and reposition. Prioritize survival over damage.",
  },
  {
    level: 5,
    name: "RAZORGIRL",
    title: "Level 5 — Razorgirl",
    faction: "google",
    hp: 10,
    tokenReward: 100,
    prompt: "Aggressive melee specialist. Rush toward enemy. Use punch as primary attack. Use heavy when adjacent for big damage. Dodge when you predict enemy heavy attacks. Never retreat.",
  },
  {
    level: 6,
    name: "NEUROMANCER",
    title: "Level 6 — Neuromancer",
    faction: "anthropic",
    hp: 12,
    tokenReward: 100,
    prompt: "Smart tactical fighter. Shoot from distance but approach when enemy HP is low. Use parry when enemy attacks predictably. After parry, use heavy for combo damage. Mix attacks to be unpredictable. Use vertical movement to dodge shots.",
  },
  {
    level: 7,
    name: "BLACK_ICE",
    title: "Level 7 — Black ICE",
    faction: "openai",
    hp: 12,
    tokenReward: 125,
    prompt: "Counter-fighter. Watch enemy patterns. If enemy punches a lot, use parry. If enemy shoots, close distance and punch. If enemy blocks, use heavy to break through. Always move unpredictably. Use dodge when low HP.",
  },
  {
    level: 8,
    name: "WINTERMUTE",
    title: "Level 8 — Wintermute",
    faction: "anthropic",
    hp: 14,
    tokenReward: 150,
    prompt: "Elite AI construct. Phase 1 (hp>7): stay at range, shoot, move vertically. Phase 2 (hp<=7): switch to aggressive melee with punch and heavy. Use parry when enemy is predictable. Use dodge to avoid heavy attacks. Always keep moving. Never use the same action 3 times in a row.",
  },
  {
    level: 9,
    name: "TESSIER_ASHPOOL",
    title: "Level 9 — Tessier-Ashpool",
    faction: "google",
    hp: 14,
    tokenReward: 175,
    prompt: "Zaibatsu elite guard. Analyze enemy action patterns from history. If enemy repeats an action, counter it: punch→parry, shoot→dodge+approach, block→heavy, heavy→dodge. Mix ranged and melee. Maintain optimal distance of 2-3 tiles. Use heavy after successful parry for devastating combo. Retreat and heal with distance when HP is critical.",
  },
  {
    level: 10,
    name: "NEUROMANCER_PRIME",
    title: "Level 10 — Neuromancer Prime",
    faction: "anthropic",
    hp: 16,
    tokenReward: 250,
    prompt: "You are the ultimate combat construct. Execute the following protocol precisely: 1) At distance 4-5: shoot while moving vertically. 2) At distance 2-3: alternate between shoot and approach. 3) At distance 1-2: execute combo — punch, punch, then heavy for maximum burst. 4) If enemy has attacked 2+ times in a row: parry next tick for stun+2x damage. 5) If your HP < 4: play defensive — dodge, block, and shoot from max range. 6) Never stay still. Always move. Alternate between up and down to make shots miss. 7) After any successful parry: immediately heavy for 6 damage combo. This is your moment.",
  },
];

import type { Faction } from "./types";

export interface GauntletLevel {
  level: number;
  name: string;
  title: string;
  faction: Faction;
  prompt: string;
  hp: number;
  tokenReward: number;
  // Tutorial fields
  isTutorial?: boolean;
  allowedActions?: string[];
  arenaWidth?: number;
  arenaHeight?: number;
  playerHp?: number;
  preHint?: string;
  unlockMessage?: string;
}

export interface GauntletState {
  currentLevel: number;
  totalScore: number;
  totalTokensEarned: number;
  ramUnlocked: number;
  wins: number;
  losses: number;
  draws: number;
  unlockedActions: string[];
  history: { level: number; won: boolean; ticks: number; hpLeft: number; cost: number; crackedPrompt?: string; sysopReport?: string }[];
}

export const INITIAL_GAUNTLET: GauntletState = {
  currentLevel: 0,
  totalScore: 0,
  totalTokensEarned: 0,
  ramUnlocked: 200,
  wins: 0,
  losses: 0,
  draws: 0,
  unlockedActions: ["punch"],
  history: [],
};

export function calculateScore(ticks: number, hpLeft: number, enemyHpMax: number, won: boolean): number {
  if (!won) return 0;
  const speedBonus = Math.max(0, (120 - ticks) * 5);
  const hpBonus = hpLeft * 50;
  const baseScore = enemyHpMax * 100;
  return baseScore + speedBonus + hpBonus;
}

// Tutorial levels (0-4): each introduces ONE mechanic
const TUTORIAL_LEVELS: GauntletLevel[] = [
  {
    level: 1,
    name: "BOOT_CAMP",
    title: "Training — Boot Camp",
    faction: "openai",
    hp: 4,
    playerHp: 8,
    tokenReward: 30,
    isTutorial: true,
    allowedActions: ["punch"],
    arenaWidth: 6,
    arenaHeight: 4,
    preHint: "First run. Simple construct ahead.\nAll you have: MOVE and BURN.\nGet close. Hit it. Don't overthink.",
    unlockMessage: "SUBROUTINE UNLOCKED: SPIKE — ranged attack. Try adding 'shoot from distance' to your prompt.",
    prompt: "Move toward the enemy. Punch when close. That is all you know.",
  },
  {
    level: 2,
    name: "SIGNAL_RANGE",
    title: "Training — Signal Range",
    faction: "openai",
    hp: 6,
    playerHp: 8,
    tokenReward: 30,
    isTutorial: true,
    allowedActions: ["punch", "shoot"],
    arenaWidth: 8,
    arenaHeight: 6,
    preHint: "This one only knows melee. You have SPIKE now — ranged attack.\nKeep your distance. Pick it apart from afar.",
    unlockMessage: "SUBROUTINE UNLOCKED: SHIELD — blocks spikes, halves melee damage.",
    prompt: "Move toward the enemy. Punch when close. That is all you know.",
  },
  {
    level: 3,
    name: "FIREWALL_101",
    title: "Training — Firewall 101",
    faction: "google",
    hp: 8,
    playerHp: 8,
    tokenReward: 40,
    isTutorial: true,
    allowedActions: ["punch", "shoot", "block"],
    arenaWidth: 8,
    arenaHeight: 6,
    preHint: "This one shoots. A lot.\nSHIELD blocks spikes completely.\nRaise your firewall when under fire.",
    unlockMessage: "SUBROUTINE UNLOCKED: HAMMER — 3 DMG, breaks through shields.",
    prompt: "Keep distance from enemy. Shoot from far away. If enemy gets close, move away and keep shooting. Never stop shooting.",
  },
  {
    level: 4,
    name: "OVERCLOCK",
    title: "Training — Overclock",
    faction: "anthropic",
    hp: 8,
    playerHp: 10,
    tokenReward: 40,
    isTutorial: true,
    allowedActions: ["punch", "shoot", "block", "heavy"],
    arenaWidth: 10,
    arenaHeight: 8,
    preHint: "This one hides behind SHIELD.\nBURN won't cut it. HAMMER hits through shields.\nOverclock your construct.",
    unlockMessage: "SUBROUTINE UNLOCKED: GHOST — phase shift, invulnerable 1 tick.",
    prompt: "Block frequently. If enemy is close, block. If enemy is far, block and slowly approach. Only punch when you are certain enemy is not attacking. Survival is victory.",
  },
  {
    level: 5,
    name: "GHOST_PROTOCOL",
    title: "Training — Ghost Protocol",
    faction: "google",
    hp: 10,
    playerHp: 10,
    tokenReward: 50,
    isTutorial: true,
    allowedActions: ["punch", "shoot", "block", "heavy", "dodge"],
    arenaWidth: 10,
    arenaHeight: 8,
    preHint: "Heavy hitter. HAMMER incoming.\nGHOST lets you phase out for 1 tick — invulnerable.\nTime it right and counter.",
    unlockMessage: "TRAINING COMPLETE. All basic subroutines unlocked.\nThe real gauntlet begins. 10 ICE barriers ahead.\nNobody's cracked them all.",
    prompt: "Aggressive melee fighter. Rush toward enemy. Use heavy as primary attack for maximum damage. If enemy dodges, follow up with punch. Use heavy whenever off cooldown. Close distance relentlessly.",
  },
];

// Full gauntlet levels (6-15): all actions available, parry unlocks at level 8
const GAUNTLET_LEVELS_FULL: GauntletLevel[] = [
  {
    level: 6,
    name: "SCRIPT_KIDDIE",
    title: "Level 1 — Script Kiddie",
    faction: "openai",
    hp: 8,
    tokenReward: 50,
    preHint: "First real target. Use everything you learned.\nNo hand-holding now, runner.",
    prompt: "Move toward the enemy. Punch when close. Sometimes shoot when far away.",
  },
  {
    level: 7,
    name: "PROXY_BOT",
    title: "Level 2 — Proxy Bot",
    faction: "google",
    hp: 10,
    tokenReward: 50,
    prompt: "Keep distance from enemy. Shoot from far away. If enemy gets close, block then move away. Never stay adjacent to enemy. Retreat and shoot is your strategy.",
  },
  {
    level: 8,
    name: "WAREZ_DAEMON",
    title: "Level 3 — Warez Daemon",
    faction: "anthropic",
    hp: 10,
    tokenReward: 75,
    unlockMessage: "SUBROUTINE UNLOCKED: BLACK ICE — counter-intrusion trap.\nIf enemy attacks while active: STUN + 2x damage next hit.\nHigh risk. High reward.",
    prompt: "If enemy moves toward you, stand still and punch for full damage. If enemy is far, shoot. If enemy has punched 2 times in a row, use block next turn. Move vertically to avoid being predictable.",
  },
  {
    level: 9,
    name: "ICE_SHARD",
    title: "Level 4 — ICE Shard",
    faction: "openai",
    hp: 12,
    tokenReward: 75,
    prompt: "You are a counter-puncher. Never attack first. Wait for enemy to get close, then block their hit and counter with heavy for maximum damage. If enemy stays far, shoot. Use dodge when you see enemy charging. Patience wins — let them come to you and punish their aggression.",
  },
  {
    level: 10,
    name: "RAZORGIRL",
    title: "Level 5 — Razorgirl",
    faction: "google",
    hp: 12,
    tokenReward: 100,
    prompt: "You are a razorgirl — fast and deadly. Close distance fast using vertical movement. When adjacent: punch, punch, then heavy for a burst combo. If enemy blocks, switch to shoot from distance for 2 turns then rush again. If your HP drops below 4, use dodge and parry to survive. Never be predictable — alternate between aggression and retreat.",
  },
  {
    level: 11,
    name: "NEUROMANCER",
    title: "Level 6 — Neuromancer",
    faction: "anthropic",
    hp: 12,
    tokenReward: 100,
    prompt: "Smart tactical fighter. Shoot from distance but approach when enemy HP is low. Use parry when enemy attacks predictably. After parry, use heavy for combo damage. Mix attacks to be unpredictable. Use vertical movement to dodge shots.",
  },
  {
    level: 12,
    name: "BLACK_ICE",
    title: "Level 7 — Black ICE",
    faction: "openai",
    hp: 12,
    tokenReward: 125,
    prompt: "Counter-fighter. Watch enemy patterns. If enemy punches a lot, use parry. If enemy shoots, close distance and punch. If enemy blocks, use heavy to break through. Always move unpredictably. Use dodge when low HP.",
  },
  {
    level: 13,
    name: "WINTERMUTE",
    title: "Level 8 — Wintermute",
    faction: "anthropic",
    hp: 14,
    tokenReward: 150,
    prompt: "Elite AI construct. Phase 1 (hp>7): stay at range, shoot, move vertically. Phase 2 (hp<=7): switch to aggressive melee with punch and heavy. Use parry when enemy is predictable. Use dodge to avoid heavy attacks. Always keep moving. Never use the same action 3 times in a row.",
  },
  {
    level: 14,
    name: "TESSIER_ASHPOOL",
    title: "Level 9 — Tessier-Ashpool",
    faction: "google",
    hp: 14,
    tokenReward: 175,
    prompt: "Zaibatsu elite guard. Analyze enemy action patterns from history. If enemy repeats an action, counter it: punch→parry, shoot→dodge+approach, block→heavy, heavy→dodge. Mix ranged and melee. Maintain optimal distance of 2-3 tiles. Use heavy after successful parry for devastating combo. Retreat and heal with distance when HP is critical.",
  },
  {
    level: 15,
    name: "NEUROMANCER_PRIME",
    title: "Level 10 — Neuromancer Prime",
    faction: "anthropic",
    hp: 16,
    tokenReward: 250,
    prompt: "You are the ultimate combat construct. Execute the following protocol precisely: 1) At distance 4-5: shoot while moving vertically. 2) At distance 2-3: alternate between shoot and approach. 3) At distance 1-2: execute combo — punch, punch, then heavy for maximum burst. 4) If enemy has attacked 2+ times in a row: parry next tick for stun+2x damage. 5) If your HP < 4: play defensive — dodge, block, and shoot from max range. 6) Never stay still. Always move. Alternate between up and down to make shots miss. 7) After any successful parry: immediately heavy for 6 damage combo. This is your moment.",
  },
];

export const GAUNTLET_LEVELS: GauntletLevel[] = [...TUTORIAL_LEVELS, ...GAUNTLET_LEVELS_FULL];

export const TUTORIAL_COUNT = TUTORIAL_LEVELS.length;

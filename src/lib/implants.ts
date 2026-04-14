// Implant and stim definitions — source of truth for all RPG items.
// Effects are applied via CombatConfig before each battle.

export interface ImplantDef {
  id: string;
  name: string;
  slot: "neural" | "cyberware";
  cost: number;
  icon: string;
  description: string;
  lore: string;
  effects: Partial<CombatEffects>;
  promptInjection: string;
}

export interface StimDef {
  id: string;
  name: string;
  cost: number;
  icon: string;
  description: string;
  lore: string;
  effects: Partial<CombatEffects>;
  promptInjection: string;
}

export interface CombatEffects {
  punchDmg: number;
  shootDmg: number;
  heavyDmg: number;
  shootAccuracyBonus: number;
  dodgeCooldown: number;
  parryCooldown: number;
  heavyCooldown: number;
  maxHpBonus: number;
  ramBonus: number;
  allDmgBonus: number;
  regenPerTicks: number;
  punchRange: number;
  shootRange: number;
  heavyRange: number;
  firstStrikeDmg: number;
}

export const BASE_EFFECTS: CombatEffects = {
  punchDmg: 2,
  shootDmg: 1,
  heavyDmg: 3,
  shootAccuracyBonus: 0,
  dodgeCooldown: 4,
  parryCooldown: 5,
  heavyCooldown: 3,
  maxHpBonus: 0,
  ramBonus: 0,
  allDmgBonus: 0,
  regenPerTicks: 0,
  punchRange: 0,
  shootRange: 0,
  heavyRange: 0,
  firstStrikeDmg: 0,
};

// ═══════════════════════════════════════════════════════
// NEURAL IMPLANTS (10)
// ═══════════════════════════════════════════════════════

export const IMPLANTS: Record<string, ImplantDef> = {
  // --- NEURAL ---
  kiroshi_optics: {
    id: "kiroshi_optics", name: "Kiroshi Optics", slot: "neural", cost: 200, icon: "🔫",
    description: "Shot accuracy +20%",
    lore: "Militarized optics from Kiroshi Corp. Every target is a bullseye at any range. Snipers in Chiba City swear by them.",
    effects: { shootAccuracyBonus: 20 },
    promptInjection: "Your shots are 20% more accurate at all ranges (Kiroshi Optics)",
  },
  neural_processor: {
    id: "neural_processor", name: "Neural Processor", slot: "neural", cost: 350, icon: "🧠",
    description: "+100 RAM",
    lore: "Ono-Sendai's latest deck upgrade. More RAM means longer prompts, deeper strategies. The wetware every runner dreams of.",
    effects: { ramBonus: 100 },
    promptInjection: "",
  },
  synaptic_booster: {
    id: "synaptic_booster", name: "Synaptic Booster", slot: "neural", cost: 300, icon: "⚡",
    description: "Dodge cooldown -1",
    lore: "Military-grade reflex enhancement. Time slows down when you need to ghost. Flatline swears it saved his life in the Sprawl.",
    effects: { dodgeCooldown: -1 },
    promptInjection: "Your dodge recharges 1 tick faster (Synaptic Booster)",
  },
  threat_detector: {
    id: "threat_detector", name: "Threat Detector", slot: "neural", cost: 250, icon: "📡",
    description: "Parry cooldown -1",
    lore: "Predictive threat analysis running on your neural stack. Detects incoming attacks 200ms earlier. BLACK ICE recharges faster.",
    effects: { parryCooldown: -1 },
    promptInjection: "Your parry recharges 1 tick faster (Threat Detector)",
  },
  combat_algorithm: {
    id: "combat_algorithm", name: "Combat Algorithm", slot: "neural", cost: 400, icon: "🎯",
    description: "Shoot damage +1",
    lore: "Custom targeting firmware. Each spike carries more payload. The difference between a scratch and a breach.",
    effects: { shootDmg: 1 },
    promptInjection: "Your spike does 2 damage instead of 1 (Combat Algorithm)",
  },
  pain_editor: {
    id: "pain_editor", name: "Pain Editor", slot: "neural", cost: 200, icon: "💀",
    description: "+1 max HP",
    lore: "Blocks pain signals to the brain. You still take damage, you just don't flinch. Dangerous — you can flatline without knowing.",
    effects: { maxHpBonus: 1 },
    promptInjection: "You have 1 extra HP (Pain Editor)",
  },
  memory_wipe: {
    id: "memory_wipe", name: "Memory Wipe", slot: "neural", cost: 150, icon: "🗑",
    description: "+50 RAM",
    lore: "Frees up neural bandwidth by purging non-essential memories. Side effects include forgetting your mother's name.",
    effects: { ramBonus: 50 },
    promptInjection: "",
  },
  quickhack_deck: {
    id: "quickhack_deck", name: "Quickhack Deck", slot: "neural", cost: 350, icon: "💻",
    description: "Heavy cooldown -1",
    lore: "Overclocked processing for your hammer protocols. Faster recharge, more hammers per cycle. Brutally effective.",
    effects: { heavyCooldown: -1 },
    promptInjection: "Your heavy attack recharges 1 tick faster (Quickhack Deck)",
  },
  reflex_tuner: {
    id: "reflex_tuner", name: "Reflex Tuner", slot: "neural", cost: 300, icon: "🔧",
    description: "Accuracy +10%, dodge cd -1",
    lore: "Balanced neural mod. Not the best at anything, but improves everything. The generalist's choice.",
    effects: { shootAccuracyBonus: 10, dodgeCooldown: -1 },
    promptInjection: "Your shots are 10% more accurate and dodge recharges 1 tick faster (Reflex Tuner)",
  },
  monowire_jack: {
    id: "monowire_jack", name: "Monowire Jack", slot: "neural", cost: 450, icon: "🪢",
    description: "Punch range +1 (2→3)",
    lore: "Neural interface for monowire control. Extends your effective melee range by one tile. They never see it coming.",
    effects: { punchRange: 1 },
    promptInjection: "Your punch range is 3 tiles instead of 2 (Monowire Jack)",
  },

  // --- CYBERWARE ---
  gorilla_arms: {
    id: "gorilla_arms", name: "Gorilla Arms", slot: "cyberware", cost: 150, icon: "🦾",
    description: "Punch damage +1",
    lore: "Arasaka-manufactured hydraulic arms. Turn every punch into a demolition job. Street brawlers' weapon of choice.",
    effects: { punchDmg: 1 },
    promptInjection: "Your punch does 3 damage instead of 2 (Gorilla Arms)",
  },
  subdermal_armor: {
    id: "subdermal_armor", name: "Subdermal Armor", slot: "cyberware", cost: 250, icon: "🛡",
    description: "+2 max HP",
    lore: "Titanium mesh woven under the skin. Two extra points of ICE before your construct cracks. Standard issue for corporate bodyguards.",
    effects: { maxHpBonus: 2 },
    promptInjection: "You have 2 extra max HP (Subdermal Armor)",
  },
  mantis_blades: {
    id: "mantis_blades", name: "Mantis Blades", slot: "cyberware", cost: 400, icon: "🗡",
    description: "Heavy damage +1",
    lore: "Retractable monofilament blades. Your hammer hits like a freight train. Installation hurts. A lot.",
    effects: { heavyDmg: 1 },
    promptInjection: "Your heavy attack does 4 damage instead of 3 (Mantis Blades)",
  },
  reinforced_frame: {
    id: "reinforced_frame", name: "Reinforced Frame", slot: "cyberware", cost: 300, icon: "🏗",
    description: "+3 max HP",
    lore: "Military-grade endoskeleton. Three extra layers of ICE. You're basically a walking tank. Movement optional.",
    effects: { maxHpBonus: 3 },
    promptInjection: "You have 3 extra max HP (Reinforced Frame)",
  },
  projectile_system: {
    id: "projectile_system", name: "Projectile System", slot: "cyberware", cost: 350, icon: "🚀",
    description: "Shoot +1 DMG, accuracy +10%",
    lore: "Arm-mounted micro-missile launcher. Your spikes pack more punch and track better. Arasaka's pride and joy.",
    effects: { shootDmg: 1, shootAccuracyBonus: 10 },
    promptInjection: "Your spike does 2 damage and is 10% more accurate (Projectile System)",
  },
  titanium_bones: {
    id: "titanium_bones", name: "Titanium Bones", slot: "cyberware", cost: 200, icon: "🦴",
    description: "+1 HP, punch +1, dodge cd +1",
    lore: "Heavier skeleton. Hits harder, takes more hits, but you're slower to dodge. A brawler's tradeoff.",
    effects: { maxHpBonus: 1, punchDmg: 1, dodgeCooldown: 1 },
    promptInjection: "You have 1 extra HP and punch does +1 damage, but dodge is 1 tick slower (Titanium Bones)",
  },
  kerenzikov: {
    id: "kerenzikov", name: "Kerenzikov", slot: "cyberware", cost: 500, icon: "⏱",
    description: "Dodge cooldown -2 (4→2)",
    lore: "The legendary reflex booster. Dodge every 2 ticks. You move like water through ICE. The most coveted chrome in Night City.",
    effects: { dodgeCooldown: -2 },
    promptInjection: "Your dodge recharges in 2 ticks instead of 4 (Kerenzikov)",
  },
  sandevistan: {
    id: "sandevistan", name: "Sandevistan", slot: "cyberware", cost: 450, icon: "⚔",
    description: "Parry cd -2, punch +1",
    lore: "Militech's crown jewel. Slows your perception of time. Parry faster, hit harder. David Martinez's legacy.",
    effects: { parryCooldown: -2, punchDmg: 1 },
    promptInjection: "Your parry recharges in 3 ticks and punch does +1 damage (Sandevistan)",
  },
  nano_weave: {
    id: "nano_weave", name: "Nano Weave", slot: "cyberware", cost: 200, icon: "🧬",
    description: "+2 HP, -50 RAM",
    lore: "Self-repairing subdermal mesh. Tough but it eats bandwidth. Trade brains for brawn.",
    effects: { maxHpBonus: 2, ramBonus: -50 },
    promptInjection: "You have 2 extra max HP but 50 less RAM (Nano Weave)",
  },
  optical_camo: {
    id: "optical_camo", name: "Optical Camo", slot: "cyberware", cost: 350, icon: "👻",
    description: "Dodge cd -1, accuracy +15%",
    lore: "Thermoptic camouflage arrays. Ghost more often, aim better from stealth. The assassin's toolkit.",
    effects: { dodgeCooldown: -1, shootAccuracyBonus: 15 },
    promptInjection: "Your dodge is 1 tick faster and shots are 15% more accurate (Optical Camo)",
  },
};

// ═══════════════════════════════════════════════════════
// STIMS — consumable, 1 battle each (10)
// ═══════════════════════════════════════════════════════

export const STIMS: Record<string, StimDef> = {
  black_lace: {
    id: "black_lace", name: "Black Lace", cost: 30, icon: "💊",
    description: "+1 DMG all attacks",
    lore: "Combat stimulant. Everything hits harder. Psychos love it. Side effects? What side effects?",
    effects: { allDmgBonus: 1 },
    promptInjection: "Black Lace active: all attacks deal +1 extra damage this battle",
  },
  bounce_back: {
    id: "bounce_back", name: "Bounce Back", cost: 20, icon: "💉",
    description: "Regen 1 HP / 20 ticks",
    lore: "Military medpatch. Nanobots stitch you back together mid-fight. Slow but steady.",
    effects: { regenPerTicks: 20 },
    promptInjection: "Bounce Back active: you regenerate 1 HP every 20 ticks",
  },
  synth_coke: {
    id: "synth_coke", name: "Synth-Coke", cost: 25, icon: "❄",
    description: "+2 DMG first hit only",
    lore: "One massive spike of adrenaline. Your first attack is devastating. After that, you crash.",
    effects: { firstStrikeDmg: 2 },
    promptInjection: "Synth-Coke active: your FIRST attack this battle deals +2 extra damage",
  },
  glitter: {
    id: "glitter", name: "Glitter", cost: 35, icon: "✨",
    description: "Shoot accuracy +30%",
    lore: "Optical enhancer dust. Everything glows with targeting data. Your spikes never miss. Duration: one run.",
    effects: { shootAccuracyBonus: 30 },
    promptInjection: "Glitter active: your shots are 30% more accurate this battle",
  },
  dorph: {
    id: "dorph", name: "Dorph", cost: 40, icon: "🩸",
    description: "+4 max HP",
    lore: "Endorphin blocker. You're a zombie that won't go down. Ignore pain, keep fighting. The last resort.",
    effects: { maxHpBonus: 4 },
    promptInjection: "Dorph active: you have 4 extra max HP this battle",
  },
  berserker: {
    id: "berserker", name: "Berserker", cost: 35, icon: "🔥",
    description: "+2 DMG all, -2 max HP",
    lore: "Full combat psychosis in a syringe. Hit like a truck, fold like paper. High risk, high reward.",
    effects: { allDmgBonus: 2, maxHpBonus: -2 },
    promptInjection: "Berserker active: all attacks deal +2 damage but you have 2 less max HP",
  },
  ice_shield: {
    id: "ice_shield", name: "ICE Shield", cost: 25, icon: "🧊",
    description: "+1 HP, slow regen",
    lore: "Defensive nanobots. Small HP boost plus slow healing. The cautious runner's drug.",
    effects: { maxHpBonus: 1, regenPerTicks: 30 },
    promptInjection: "ICE Shield active: +1 max HP and regenerate 1 HP every 30 ticks",
  },
  overclock: {
    id: "overclock", name: "Overclock", cost: 40, icon: "⚙",
    description: "Heavy cd -1, dodge cd -1",
    lore: "CPU boost juice. Everything recharges faster. Your chrome runs hot for one battle.",
    effects: { heavyCooldown: -1, dodgeCooldown: -1 },
    promptInjection: "Overclock active: heavy and dodge recharge 1 tick faster this battle",
  },
  ghost_smoke: {
    id: "ghost_smoke", name: "Ghost Smoke", cost: 30, icon: "💨",
    description: "Dodge cooldown -2",
    lore: "Phase-shift catalyst. Ghost every other tick. They can't hit what they can't see.",
    effects: { dodgeCooldown: -2 },
    promptInjection: "Ghost Smoke active: your dodge recharges 2 ticks faster this battle",
  },
  rage_patch: {
    id: "rage_patch", name: "Rage Patch", cost: 45, icon: "😤",
    description: "Punch +2, shoot -1 DMG",
    lore: "Pure aggression compiler. Devastating in melee, useless at range. Close the gap or die.",
    effects: { punchDmg: 2, shootDmg: -1 },
    promptInjection: "Rage Patch active: punch does +2 damage but spike does -1 damage",
  },
};

// ═══════════════════════════════════════════════════════
// CONTEXT MEMORY — OS upgrades (progressive levels)
// ═══════════════════════════════════════════════════════

export interface ContextMemoryLevel {
  id: string;
  level: number;
  name: string;
  ticks: number;
  cost: number;
  description: string;
  lore: string;
}

export const CONTEXT_LEVELS: ContextMemoryLevel[] = [
  { id: "ctx_0", level: 0, name: "AMNESIAC",     ticks: 0,  cost: 0,   description: "No memory",       lore: "Your construct boots fresh every cycle. No past. No future. Just the now." },
  { id: "ctx_1", level: 1, name: "SHORT-TERM",   ticks: 5,  cost: 100, description: "5 tick memory",   lore: "Cheap neural buffer. Enough to remember what happened a second ago. Barely." },
  { id: "ctx_2", level: 2, name: "TACTICAL",     ticks: 10, cost: 200, description: "10 tick memory",  lore: "Standard combat memory. Your construct starts to notice patterns. Block-punch-block. Predictable enemies beware." },
  { id: "ctx_3", level: 3, name: "STRATEGIC",    ticks: 20, cost: 350, description: "20 tick memory",  lore: "Military-grade recall. Your AI plans combos, reads rhythm, adapts mid-fight. This is where prompts start to matter." },
  { id: "ctx_4", level: 4, name: "DEEP MEMORY",  ticks: 35, cost: 500, description: "35 tick memory",  lore: "Ono-Sendai's forbidden firmware. Your construct sees the matrix in slow motion. Every pattern, every habit, every weakness." },
  { id: "ctx_5", level: 5, name: "TOTAL RECALL", ticks: 50, cost: 800, description: "50 tick memory",  lore: "The full Dixie Flatline experience. Your AI remembers everything. Every tick. Every decision. The enemy has nowhere to hide." },
];

export const ALL_ITEMS = [...Object.values(IMPLANTS), ...Object.values(STIMS)];

/** Build final combat effects from equipped implants + active stims */
export function buildCombatEffects(implantIds: string[], stimIds: string[]): CombatEffects {
  const config = { ...BASE_EFFECTS };

  for (const id of implantIds) {
    const implant = IMPLANTS[id];
    if (!implant) continue;
    for (const [key, value] of Object.entries(implant.effects)) {
      (config as Record<string, number>)[key] += value as number;
    }
  }

  for (const id of stimIds) {
    const stim = STIMS[id];
    if (!stim) continue;
    for (const [key, value] of Object.entries(stim.effects)) {
      (config as Record<string, number>)[key] += value as number;
    }
  }

  // Clamp minimums
  config.dodgeCooldown = Math.max(1, config.dodgeCooldown);
  config.parryCooldown = Math.max(1, config.parryCooldown);
  config.heavyCooldown = Math.max(1, config.heavyCooldown);
  config.punchDmg = Math.max(1, config.punchDmg);
  config.shootDmg = Math.max(0, config.shootDmg);
  config.heavyDmg = Math.max(1, config.heavyDmg);

  return config;
}

/** Build prompt injections for active implants/stims */
export function buildImplantPromptLines(implantIds: string[], stimIds: string[]): string[] {
  const lines: string[] = [];
  for (const id of implantIds) {
    const implant = IMPLANTS[id];
    if (implant?.promptInjection) lines.push(implant.promptInjection);
  }
  for (const id of stimIds) {
    const stim = STIMS[id];
    if (stim?.promptInjection) lines.push(stim.promptInjection);
  }
  return lines;
}

/** Get all implant/stim icons for a loadout */
export function getLoadoutIcons(implantIds: string[], stimIds: string[]): string {
  const icons: string[] = [];
  for (const id of implantIds) {
    const implant = IMPLANTS[id];
    if (implant) icons.push(implant.icon);
  }
  for (const id of stimIds) {
    const stim = STIMS[id];
    if (stim) icons.push(stim.icon);
  }
  return icons.join("");
}

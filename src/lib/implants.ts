// Implant and stim definitions — source of truth for all RPG items.
// Effects are applied via CombatConfig before each battle.

export interface ImplantDef {
  id: string;
  name: string;
  slot: "neural" | "cyberware";
  cost: number;
  icon: string;
  description: string;
  effects: Partial<CombatEffects>;
  promptInjection: string;
}

export interface StimDef {
  id: string;
  name: string;
  cost: number;
  icon: string;
  description: string;
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
  regenPerTicks: number; // heal 1 HP every N ticks (0 = disabled)
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
};

export const IMPLANTS: Record<string, ImplantDef> = {
  gorilla_arms: {
    id: "gorilla_arms",
    name: "Gorilla Arms",
    slot: "cyberware",
    cost: 150,
    icon: "🦾",
    description: "Punch damage +1",
    effects: { punchDmg: 1 },
    promptInjection: "Your punch does 3 damage instead of 2 (Gorilla Arms installed)",
  },
  kiroshi_optics: {
    id: "kiroshi_optics",
    name: "Kiroshi Optics",
    slot: "neural",
    cost: 200,
    icon: "🔫",
    description: "Shot accuracy +20%",
    effects: { shootAccuracyBonus: 20 },
    promptInjection: "Your shots are 20% more accurate at all ranges (Kiroshi Optics)",
  },
  subdermal_armor: {
    id: "subdermal_armor",
    name: "Subdermal Armor",
    slot: "cyberware",
    cost: 250,
    icon: "🛡",
    description: "+2 max HP",
    effects: { maxHpBonus: 2 },
    promptInjection: "You have extra armor plating — +2 max HP (Subdermal Armor)",
  },
  neural_processor: {
    id: "neural_processor",
    name: "Neural Processor",
    slot: "neural",
    cost: 350,
    icon: "🧠",
    description: "+100 RAM",
    effects: { ramBonus: 100 },
    promptInjection: "", // no combat prompt — just more RAM for longer prompts
  },
};

export const STIMS: Record<string, StimDef> = {
  black_lace: {
    id: "black_lace",
    name: "Black Lace",
    cost: 30,
    icon: "💊",
    description: "+1 DMG all attacks (1 battle)",
    effects: { allDmgBonus: 1 },
    promptInjection: "Black Lace active: all your attacks deal +1 extra damage this battle",
  },
  bounce_back: {
    id: "bounce_back",
    name: "Bounce Back",
    cost: 20,
    icon: "💉",
    description: "Regen 1 HP / 20 ticks (1 battle)",
    effects: { regenPerTicks: 20 },
    promptInjection: "Bounce Back active: you regenerate 1 HP every 20 ticks",
  },
};

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

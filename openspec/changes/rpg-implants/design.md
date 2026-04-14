# Design: RPG Implants, Stims & Credits

## How implants influence the AI

Every implant modifies TWO things:
1. **Engine params** — actual damage/cooldown/HP numbers in resolveTick
2. **System prompt** — the LLM sees its modified stats and adapts strategy

```
BEFORE BATTLE:

  Runner's implants (from DB)
       │
       ▼
  Calculate combat config
  {
    punchDmg: 2 + gorilla_arms(1) = 3,
    shootAccuracyBonus: 0.20,    // kiroshi
    maxHp: 10 + subdermal(2) = 12,
    extraRam: 100,               // neural processor
    stimEffects: { dmgBonus: 1 } // black lace active
  }
       │
       ├──► Engine uses config numbers in resolveTick
       │
       └──► buildSystemRules() injects into LLM prompt:
            "Your punch does 3 damage (Gorilla Arms installed)"
            "Your shots are 20% more accurate (Kiroshi Optics)"
            "You have 12 HP (Subdermal Armor)"
```

## Implant definitions (v1 — contest scope)

### Permanent implants (4)

```
GORILLA ARMS
  slot: cyberware
  cost: ¤150
  engine: punchDmg += 1 (2 → 3)
  prompt: "Your punch does 3 damage instead of 2 (Gorilla Arms)"
  log marker: 🦾

KIROSHI OPTICS
  slot: neural
  cost: ¤200
  engine: shootAccuracyBonus += 0.20 (all ranges +20%)
  prompt: "Your shots are 20% more accurate at all ranges (Kiroshi Optics)"
  log marker: 🔫

SUBDERMAL ARMOR
  slot: cyberware
  cost: ¤250
  engine: maxHp += 2 (10 → 12)
  prompt: "You have 12 HP instead of 10 (Subdermal Armor)"
  log marker: 🛡

NEURAL PROCESSOR
  slot: neural
  cost: ¤350
  engine: (no combat change)
  effect: runner.ram += 100
  prompt: (no injection — more RAM = longer prompt)
  log marker: 🧠
```

### Stims / consumables (2)

```
BLACK LACE
  cost: ¤30 (consumed after 1 battle)
  engine: allDmgBonus += 1 (all attacks +1)
  prompt: "Black Lace active: all your attacks deal +1 damage this battle"
  log marker: 💊

BOUNCE BACK
  cost: ¤20 (consumed after 1 battle)
  engine: regenHpPerTicks = 20 (heal 1 HP every 20 ticks)
  prompt: "Bounce Back active: you regenerate 1 HP every 20 ticks"
  log marker: 💉
```

## Slot system (v1 simplified)

```
Runner has 2 slots:
  - 1x NEURAL slot   (Kiroshi Optics OR Neural Processor)
  - 1x CYBERWARE slot (Gorilla Arms OR Subdermal Armor)

Stims: unlimited (but cost credits each battle)

Buying an implant for an occupied slot → old one is replaced.
No refund. Forces commitment.
```

## Credits economy

```
SOURCE                    AMOUNT
════════════════════════  ════════
Gauntlet win              level × 20  (L1=20, L15=300)
PVP win                   50 + (credGain × 2)
PVP loss                  10 (consolation)
First gauntlet clear      500 bonus

PRICES
════════════════════════  ════════
Black Lace (stim)         ¤30
Bounce Back (stim)        ¤20
Gorilla Arms              ¤150
Kiroshi Optics            ¤200
Subdermal Armor           ¤250
Neural Processor          ¤350
```

A player clearing all 15 gauntlet levels earns ~2,400¤.
That buys 1 neural + 1 cyberware implant with some stims left over.
Full builds require PVP earnings. This drives engagement loop.

## DB schema

### Modify runners table
```sql
ALTER TABLE runners ADD COLUMN credits INTEGER NOT NULL DEFAULT 0;
```

### New table: runner_implants
```sql
CREATE TABLE runner_implants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id   UUID NOT NULL REFERENCES runners(id),
  implant_id  TEXT NOT NULL,        -- "gorilla_arms", "kiroshi_optics", etc
  slot_type   TEXT NOT NULL,        -- "neural", "cyberware"
  equipped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(runner_id, slot_type)      -- one implant per slot
);
```

### New table: runner_stims
```sql
CREATE TABLE runner_stims (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id   UUID NOT NULL REFERENCES runners(id),
  stim_id     TEXT NOT NULL,        -- "black_lace", "bounce_back"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Implant/stim data — code constants (not DB)

```typescript
// src/lib/implants.ts
export const IMPLANTS = {
  gorilla_arms: {
    id: "gorilla_arms",
    name: "Gorilla Arms",
    slot: "cyberware",
    cost: 150,
    icon: "🦾",
    description: "Punch damage +1",
    effects: { punchDmg: 1 },
    promptInjection: "Your punch does {value} damage instead of 2 (Gorilla Arms installed)",
  },
  kiroshi_optics: { ... },
  subdermal_armor: { ... },
  neural_processor: { ... },
} as const;

export const STIMS = {
  black_lace: {
    id: "black_lace",
    name: "Black Lace",
    cost: 30,
    icon: "💊",
    description: "+1 DMG all attacks (1 battle)",
    effects: { allDmgBonus: 1 },
    promptInjection: "Black Lace active: all attacks deal +1 damage this battle",
  },
  bounce_back: { ... },
} as const;
```

## Combat config builder

```typescript
// src/lib/combat-config.ts
interface CombatConfig {
  punchDmg: number;       // base 2
  shootDmg: number;       // base 1
  heavyDmg: number;       // base 3
  shootAccuracyBonus: number; // base 0
  dodgeCooldown: number;  // base 4
  parryCooldown: number;  // base 5
  heavyCooldown: number;  // base 3
  maxHp: number;          // base 10
  regenPerTicks: number;  // 0 = no regen
  allDmgBonus: number;    // 0 = no bonus
  ramBonus: number;       // 0 = no extra RAM
}

function buildCombatConfig(implants: string[], stims: string[]): CombatConfig {
  const config = { ...BASE_CONFIG };
  for (const id of implants) {
    const implant = IMPLANTS[id];
    // Apply each effect to config
  }
  for (const id of stims) {
    const stim = STIMS[id];
    // Apply each effect to config
  }
  return config;
}
```

## Engine changes

`resolveTick()` currently hardcodes damage values. Changes needed:

```
engine.ts line 246:  const dmg = 2;           → const dmg = config.punchDmg;
engine.ts line 281:  const dmg = 1;           → const dmg = config.shootDmg;
engine.ts line 311:  const dmg = 3;           → const dmg = config.heavyDmg;
engine.ts line 89:   accuracy calc            → + config.shootAccuracyBonus
engine.ts line 205:  cooldown 4               → config.dodgeCooldown
engine.ts line 209:  cooldown 5               → config.parryCooldown
engine.ts line 324:  cooldown 3               → config.heavyCooldown
engine.ts line 23:   maxHp from param         → config.maxHp (already parameterized)
NEW:                 regen check every N ticks → if config.regenPerTicks > 0
NEW:                 allDmgBonus added to all attacks
```

`buildSystemRules()` receives config and injects implant descriptions into the prompt.

## API routes

### GET /api/ripper/stock
Returns all available implants/stims with prices and whether runner already owns each.

### POST /api/ripper/buy
```typescript
{ token: string, itemId: string, type: "implant" | "stim" }
```
Validates credits, creates/replaces runner_implant or runner_stim.
Returns updated credits + equipped items.

### GET /api/ripper/loadout
Returns runner's current implants + active stims + credits.

### POST /api/score (modify)
Add credit reward to existing score endpoint.
```
credits += level * 20  (gauntlet)
```

### POST /api/pvp/attack (modify)
Add credit reward after battle.
```
credits += won ? (50 + credGain * 2) : 10
```

## RipperDoc Terminal UI

Overlay modal (same pattern as leaderboard). CRT aesthetic.

```
Left side: YOUR DECK
  - Show equipped implants per slot
  - Show active stims
  - Show modified stats vs base
  
Right side: RIPPER'S STOCK
  - Available implants/stims
  - Price, effect description
  - [BUY] button (disabled if can't afford)
  - "EQUIPPED" badge if already have it
  
Footer:
  - Credits balance
  - SYSOP commentary on purchases
```

### Buy flow (3 clicks)
1. Open [RIPPER] in header
2. Click [BUY] on an item
3. SYSOP confirms: "Gorilla Arms installed. Punch now deals 3 DMG."
   → Auto-equips, old implant replaced if slot full
   → Stats update in real-time on left side
   → ESC to close

### Header integration
```
[GAUNTLET] [PVP] [FREE] [RANKING] [RIPPER]
                                   ¤ 450  🦾🔫
```
Credits shown next to RIPPER button. Implant icons after credits.

### Combat log integration
When an implant-modified action occurs:
```
[P] Burn -3 ICE [8/12] 🦾     ← Gorilla Arms boosted damage
[P] Spike HIT -1 ICE 🔫       ← Kiroshi improved accuracy
[P] +1 HP (regen) 💉          ← Bounce Back healed
```
Icon appended to relevant log lines. Subtle but informative.

## Files to create
- `src/lib/implants.ts` — implant/stim definitions, types
- `src/lib/combat-config.ts` — build config from implants/stims
- `src/components/ripper-terminal.tsx` — RipperDoc overlay UI
- `src/app/api/ripper/stock/route.ts`
- `src/app/api/ripper/buy/route.ts`
- `src/app/api/ripper/loadout/route.ts`

## Files to modify
- `src/lib/db/schema.ts` — credits column, runner_implants, runner_stims tables
- `src/lib/engine.ts` — parameterize all damage/cooldown/HP values via config
- `src/app/api/battle/route.ts` — load implants, build config, pass to engine
- `src/app/api/score/route.ts` — add credit rewards
- `src/app/api/pvp/attack/route.ts` — add credit rewards
- `src/app/page.tsx` — RIPPER header button, pass config to Arena, load loadout
- `src/components/combat-log.tsx` — implant markers in log lines
- `src/components/arena.tsx` — (v2: visual effects per implant)

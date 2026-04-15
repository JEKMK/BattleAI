# Design: Arena Items + Anti-Camping

## Engine changes (engine.ts)

### New GameState fields
```typescript
interface GameState {
  // ...existing
  items: ArenaItem[];        // items currently on the map
  campingTicks: [number, number]; // [red camping count, blue camping count]
}

interface ArenaItem {
  id: string;
  type: "repair_kit" | "firewall_boost" | "power_surge" | "virus_trap" | "emp_burst" | "overclock";
  x: number;
  y: number;
  ticksLeft: number;    // despawns when 0
  effect: string;       // human-readable for AI
}
```

### Item definitions
```typescript
const ARENA_ITEMS = {
  repair_kit:     { label: "REPAIR KIT",     effect: "+5 HP",                        rarity: 0.25 },
  firewall_boost: { label: "FIREWALL BOOST", effect: "+2 block power for 3 ticks",   rarity: 0.20 },
  power_surge:    { label: "POWER SURGE",    effect: "+2 attack damage for 3 ticks", rarity: 0.20 },
  virus_trap:     { label: "VIRUS TRAP",     effect: "-1 HP (trap!)",                rarity: 0.15 },
  emp_burst:      { label: "EMP BURST",      effect: "Stun enemy 1 tick",            rarity: 0.10 },
  overclock:      { label: "OVERCLOCK",      effect: "Reset all cooldowns to 0",     rarity: 0.10 },
};
```

### resolveTick additions

**After movement, before defense:**
1. Check item pickup — if fighter is on an item tile, consume it
2. Apply item effect immediately
3. Log: "Picked up {ITEM} — {effect}"

**After all combat resolution:**
1. Update camping counters per fighter
2. If camping >= 5: apply -1 HP, log warning
3. Spawn new items (random chance per tick)
4. Despawn expired items (ticksLeft--)

### buildTickInput additions
```json
{
  "items": [
    { "x": 4, "y": 3, "type": "repair_kit", "effect": "+5 HP", "ticksLeft": 8 }
  ],
  "you": {
    ...existing,
    "campingTicks": 0,
    "activeBuffs": ["power_surge: 2 ticks left"]
  }
}
```

### buildSystemRules addition
```
ITEMS: Items appear on the map. Move onto them to pick up.
Types: REPAIR KIT (+5 HP), POWER SURGE (+2 dmg 3 ticks), FIREWALL BOOST (+2 block 3 ticks), 
       VIRUS TRAP (-1 HP trap), EMP BURST (stun enemy), OVERCLOCK (reset cooldowns).
CAMPING: Standing still for 5+ ticks causes firewall burn (-1 HP/tick). Keep moving.
```

## Buff system

Some items give temporary buffs (3 ticks). Track per fighter:

```typescript
interface Fighter {
  // ...existing
  buffs: {
    powerSurge: number;     // ticks remaining (0 = inactive)
    firewallBoost: number;  // ticks remaining
  };
}
```

In damage calculation:
- If `powerSurge > 0`: add +2 to all attack damage
- If `firewallBoost > 0`: blocking reduces 75% melee (vs 50%), full block on ranged

Buffs tick down at end of each tick.

## Anti-camping detection

```typescript
// In resolveTick, after movement:
const redMoved = red.x !== prevRedX || red.y !== prevRedY;
const blueMoved = blue.x !== prevBlueX || blue.y !== prevBlueY;

if (!redMoved) next.campingTicks[0]++;
else next.campingTicks[0] = 0;

if (!blueMoved) next.campingTicks[1]++;
else next.campingTicks[1] = 0;

// Penalty
if (next.campingTicks[0] >= 5) {
  red.hp = Math.max(0, red.hp - 1);
  log("Neural lock — camper burn -1 HP");
}
```

## 3D Visuals (arena3d/)

### Item meshes
Each item type has a distinct 3D appearance:
- **REPAIR KIT**: Green icosahedron, floating + rotating, green pointlight
- **FIREWALL BOOST**: Blue octahedron with shield wireframe
- **POWER SURGE**: Orange tetrahedron with fire particles
- **VIRUS TRAP**: Red glitching cube (position jitters)
- **EMP BURST**: Purple torus pulsing
- **OVERCLOCK**: White star/spark, bright glow

All items: float at Y=0.5, slow rotation, bounce animation (sin wave Y), despawn fade-out.

### Pickup effect
When picked up:
- 40 particles spiral upward in item color
- Flash sphere at pickup point
- Sound effect (use "hit" sound pitched up)

### Spawn effect
When item appears:
- Particles converge from scattered positions to item point (reverse explosion)
- Glow ramps from 0 to full over 10 frames

### Camping visualization
- Tick 3-4: subtle red crackle around fighter
- Tick 5+: intense red electricity + ground burn ring expanding

## Files to modify

### Engine
- `src/lib/types.ts` — add ArenaItem, buffs to Fighter, items + campingTicks to GameState
- `src/lib/engine.ts` — item spawn/despawn/pickup, camping detection, buff system

### Visuals
- `src/components/arena3d/items-3d.tsx` — NEW: 3D item meshes + effects
- `src/components/arena3d/index.tsx` — add Items3D component, item event processing
- `src/components/arena3d/particles-3d.tsx` — more dramatic particle counts

### API
- `src/app/api/battle/route.ts` — no changes needed (engine handles items internally)

## Files NOT changed
- `src/lib/db/schema.ts` — items are per-battle, not persisted
- API routes — engine changes are internal

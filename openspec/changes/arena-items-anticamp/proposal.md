# Proposal: Arena Items + Anti-Camping + Epic Particles

## User value anchor
Battles feel static — IAs stand and trade hits. Random items on the map force movement, create tactical decisions ("grab the heal or attack?"), and make every battle unpredictable. Anti-camping punishes passive play. More particles make everything epic.

## User stories
- As a runner, I want items to appear on the map so battles feel dynamic and unique
- As a runner, I want to write prompts that tell my AI when to grab items ("grab health if HP < 50%")
- As a runner, I want to see a camper get punished so defensive spam doesn't win
- As a spectator, I want explosions and effects that look like a sci-fi movie

## Core mechanic: Arena Items

Random items spawn on empty tiles during battle. The AI can move to them and pick them up by occupying the tile. Items are visible to both fighters (the AI sees them in the tick JSON input).

### 6 Item Types

| Item | Effect | Visual | Rarity |
|------|--------|--------|--------|
| 🟢 REPAIR KIT | +5 HP | Green glow orb | Common |
| 🔵 FIREWALL BOOST | +2 block effectiveness (3 ticks) | Blue shield icon | Common |
| 🟠 POWER SURGE | +2 attack damage (3 ticks) | Orange flame orb | Common |
| 🔴 VIRUS TRAP | -1 HP to picker (risky!) | Red glitch orb | Uncommon |
| 🟣 EMP BURST | Stun enemy 1 tick (ranged) | Purple pulse orb | Rare |
| ⚡ OVERCLOCK | All cooldowns reset to 0 | White lightning orb | Rare |

### Spawn rules
- First item: spawns between tick 10-20 (random)
- Subsequent items: every 15-25 ticks (random interval)
- Max 2 items on map simultaneously
- Never spawns on occupied tile or adjacent to a fighter
- Items despawn after 15 ticks if not picked up

### AI sees items
The tick JSON input includes an `items` array:
```json
{
  "items": [
    { "x": 4, "y": 3, "type": "repair_kit", "effect": "+5 HP" }
  ]
}
```
The AI decides whether to move toward it. The RUNNER'S PROMPT can influence: "grab health items when HP is low" or "ignore items, focus on attacking".

### Pickup
If a fighter moves onto an item tile, the item is consumed. Effect applies immediately. Log entry: "Picked up REPAIR KIT — +5 HP [12/15]".

## Core mechanic: Anti-Camping

If a fighter stays on the same tile for 5 consecutive ticks without moving, they get a "CAMPER" debuff:

- **Tick 5 of camping**: Warning log "Neural lock detected — move or suffer"
- **Tick 6+**: -1 HP per tick while camping (firewall burn, same as out-of-bounds)
- **Resets** when the fighter moves to a different tile

The AI sees a `campingTicks: N` field in its state so it can react.

## Epic Particles

More dramatic visual effects across all combat:

- **Hit explosions**: 50-80 particles with multiple colors (orange + white core)
- **Heavy shockwave**: expanding sphere of particles + ground ring
- **KO**: 200 particles + white flash + construct shatters into fragments
- **Item pickup**: upward spiral of particles in item color
- **Item spawn**: particles materialize from nothing (converge to point)
- **Camping warning**: red crackling electricity around camper

## Scope — NOW
- 6 item types with spawn/despawn logic in engine.ts
- Items visible in tick JSON for AI
- Item 3D meshes floating + rotating on tiles with glow
- Pickup logic + immediate effect
- Anti-camping: 5-tick detection + HP drain
- Epic particle counts across all effects

## Status: proposed

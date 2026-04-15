# Tasks: Arena Items + Anti-Camping + Epic Particles

## Bloque 1 — Types + Engine Items (~15 min AI)
- [ ] Add ArenaItem interface + items array + campingTicks to GameState in types.ts
- [ ] Add buffs (powerSurge, firewallBoost ticks) to Fighter interface
- [ ] Define 6 item types with rarity weights in engine.ts
- [ ] Item spawn logic: first at tick 10-20, then every 15-25, max 2 on map
- [ ] Item despawn: ticksLeft-- each tick, remove at 0
- [ ] Item pickup: if fighter on item tile after movement, consume + apply effect
- [ ] Log entry on pickup with effect description

## Bloque 2 — Buff System + Anti-Camp (~10 min AI)
- [ ] Power Surge buff: +2 all attack damage for 3 ticks
- [ ] Firewall Boost buff: 75% melee block (vs 50%), full ranged block, for 3 ticks
- [ ] Buff tick-down at end of each tick
- [ ] EMP Burst: stun enemy 1 tick on pickup
- [ ] Overclock: reset all cooldowns to 0 on pickup
- [ ] Virus Trap: -1 HP to picker
- [ ] Camping detection: track consecutive same-tile ticks per fighter
- [ ] Camping penalty: -1 HP/tick after 5 ticks, log warning at tick 5

## Bloque 3 — AI Awareness (~5 min AI)
- [ ] Add items array to buildTickInput JSON (type, x, y, effect, ticksLeft)
- [ ] Add campingTicks + activeBuffs to fighter state in tick input
- [ ] Add items + camping rules to buildSystemRules

## Bloque 4 — 3D Item Meshes (~15 min AI)
- [ ] Create items-3d.tsx with distinct geometry per item type
- [ ] Float + rotate + bounce animation (useFrame)
- [ ] PointLight per item in item color
- [ ] Despawn fade-out (opacity 1→0 in last 3 ticks)
- [ ] Spawn convergence effect (particles gather to point)
- [ ] Pickup spiral particles (40 upward in item color)

## Bloque 5 — Epic Particles + Camping Visual (~10 min AI)
- [ ] Increase hit particles: 50-80 with orange + white mix
- [ ] Heavy: expanding particle sphere + ground shockwave ring
- [ ] KO: 200 particles + white flash sphere + 10 fragment boxes
- [ ] Camping: red electric crackle around fighter (tick 3+), ground burn ring (tick 5+)

## Test
- [ ] Items spawn on map between tick 10-20
- [ ] AI sees items in tick JSON input
- [ ] Moving onto item tile picks it up
- [ ] Repair Kit: HP increases
- [ ] Power Surge: damage increases for 3 ticks
- [ ] Virus Trap: HP decreases
- [ ] EMP: enemy stunned
- [ ] Camping 5+ ticks: HP drain starts
- [ ] Items visible as 3D objects with glow
- [ ] Pickup particles + sound
- [ ] KO explosion is spectacular

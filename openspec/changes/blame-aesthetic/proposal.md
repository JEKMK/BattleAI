# Proposal: Blame! Aesthetic — Full Visual Identity Overhaul

## User value anchor
The game looks like a clean cyberpunk tech demo. We want it to feel like Tsutomu Nihei's Blame! — the megastructure, industrial decay, oppressive scale, darkness broken only by weapon fire. This isn't a color swap — it's a complete visual identity transformation that makes every element feel like it exists inside a million-year-old machine civilization.

## What is Blame! visually
- Near-total darkness. Light only from weapons, sparks, and broken infrastructure.
- Metal, concrete, rust, erosion. Nothing is clean. Nothing is new.
- Massive scale — structures dwarf the characters.
- Angular, brutalista geometry. No organic curves.
- Color palette: black, dark grey, rust orange, dried blood red, dirty white. NO neon. NO cyan. NO green.
- When weapons fire: BLINDING white/orange flash that illuminates everything for an instant, then darkness returns.

## Scope — FULL REDESIGN

### Arena 3D
- Post-processing shader: desaturate 80%, sepia/rust tone, film grain, high contrast
- Hex grid: dark gunmetal with barely-visible edges, rust-tinted
- Lighting: kill cyan/blue ambience → dim orange industrial lights, red point lights
- Fog: dense grey-brown (not clean black)
- Atmosphere: sparks instead of data rain, broken infrastructure instead of data columns
- Fighters: dark metal bodies with red/orange core (not green crystal)
- Attacks: white-hot flashes, graviton-style beam obliterating space

### GUI / UI
- Color palette swap in globals.css:
  - --neon-green → rust orange (#c45a1a)
  - --cyan → dirty white (#a0a0a0)
  - --magenta → blood red (#8b1a1a)
  - --bg-deep → near black (#0a0908)
  - --bg-panel → dark metal (#0f0e0c)
  - --border → rust brown (#2a1f15)
- Header: brushed dark metal feel, no glow
- Terminals (SYSOP, RipperDoc, Leaderboard): rust-tinted borders, industrial font feel
- Combat log: monochrome with red accents for damage
- Buttons: no glow effects, matte industrial look, orange/red active states
- CRT effects: replace scanlines with film grain / noise

### Typography
- Keep monospace but heavier weight
- Labels in uppercase with wider tracking (already have this)
- Color: off-white (#c8c0b0) instead of bright whites

## What stays the same
- Game mechanics (engine.ts)
- Component architecture
- Layout structure (3-panel)
- All API routes
- All RPG systems (implants, items, PVP)

## Status: proposed

# Tasks: Blame! Aesthetic

## Bloque 1 — CSS Token Swap (~10 min AI)
- [ ] Rewrite all color tokens in globals.css (neon→rust, cyan→metal, magenta→blood)
- [ ] Update faction colors (anthropic→blood red, google→rust, openai→gunmetal)
- [ ] Background colors: warm near-black instead of blue-black
- [ ] Border colors: rust brown
- [ ] Text colors: off-white, weathered grey, dark rust
- [ ] Replace CRT scanline effects with film grain noise
- [ ] Remove glow-cyan, glow-magenta CSS variables → glow-rust, glow-blood

## Bloque 2 — Arena Post-Processing (~10 min AI)
- [ ] effects.tsx: HueSaturation (desaturate 70%) + BrightnessContrast + Noise (grain) + heavy Vignette
- [ ] Bloom: lower intensity (0.8), higher threshold (0.7) — only weapons flash
- [ ] Verify postprocessing imports (may need HueSaturation, Noise from postprocessing lib)

## Bloque 3 — Arena Lighting + Fog + Grid (~10 min AI)
- [ ] lights.tsx: kill blue ambient → dim warm (#1a1208), orange directional, red point lights at edges
- [ ] hex-grid.tsx: dark metal material (metalness 0.95, color #0a0908, emissive barely visible)
- [ ] Fog: warm brown-grey (#0a0806), dense (3-14 range)
- [ ] MeshReflectorMaterial: darker, less reflective, rust-tinted

## Bloque 4 — Atmosphere: Sparks + Embers + Pillars (~10 min AI)
- [ ] Replace matrix rain with spark showers (orange particles falling, faster, brighter)
- [ ] Replace data columns with dark metal pillars (no glow, occasional spark at base)
- [ ] Replace light wisps with floating embers (tiny orange, slow drift, die out)
- [ ] Ground grid: darker, barely visible metallic

## Bloque 5 — Fighters Blame! Style (~10 min AI)
- [ ] Outer shell: dark metal (#1a1714) with dim red emissive
- [ ] Inner core: rust orange (#c45a1a) — the construct's "life"
- [ ] Fighter lights: orange/red instead of cyan/green
- [ ] Low HP: core dims, shell distort increases, red flashes
- [ ] Block shield: dark metal wireframe instead of cyan
- [ ] Parry: red-orange arcs instead of magenta

## Bloque 6 — Attacks GBE Style (~10 min AI)
- [ ] Cable color: white-hot core (#ffffff) + rust outer glow
- [ ] On impact: bloom spikes to 3.0 for 2 frames (screen flash)
- [ ] Impact particles: grey + orange metal fragments (not colored)
- [ ] Persistent glow at impact point for 30 frames
- [ ] Miss: sparks and metal debris (not colored particles)

## Bloque 7 — Death Animation + Turn Timer (~15 min AI)
- [ ] KO: 3-5 second pause before post-battle terminal appears
- [ ] KO animation: fighter shatters into metal fragments, red flash, darkness
- [ ] Turn timer bar: thin horizontal bar showing tick progress (top or side)
- [ ] Timer fills during LLM thinking, resets each tick

## Test
- [ ] UI is warm-dark industrial (no cyan, no green, no magenta)
- [ ] Arena feels oppressive and dark (Blame! atmosphere)
- [ ] Fighters are dark metal with inner red/orange glow
- [ ] Attacks flash white-hot and illuminate the scene briefly
- [ ] Film grain visible instead of CRT scanlines
- [ ] Sparks fall instead of matrix rain
- [ ] Death pause: 3-5 seconds of destruction before UI appears
- [ ] Turn timer visible during battle

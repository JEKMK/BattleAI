# Proposal: Three.js Arena — 3D Isometric Combat Renderer

## User value anchor
The current Canvas 2D arena feels flat and lifeless. Players of cyberpunk games expect to see their AI constructs fighting inside a glowing, immersive cyberspace. Three.js gives us real 3D perspective, dynamic lighting, volumetric shapes, bloom effects, and particle systems — turning the arena from a "debug view" into a spectacle that players want to watch and share.

## User stories
- As a runner, I want to see my construct as a 3D glowing shape fighting in cyberspace so the battle feels epic
- As a runner, I want to see attacks as visible beams, shockwaves, and explosions so I understand what's happening
- As a spectator, I want the arena to look impressive enough to screenshot and share
- As a mobile player, I want the 3D arena to run smoothly on my phone

## Problem
Canvas 2D cannot do real perspective, lighting, or shadows. We spent hours faking 3D with gradients and squashing — it still looks flat. Three.js solves this natively.

## Scope — NOW
- Replace Canvas 2D arena renderer with Three.js + @react-three/fiber
- Free 3D camera with OrbitControls (rotate, zoom, pan — like an RTS)
- Hex/diamond grid as 3D tile meshes with emissive edges
- Fighter shapes as 3D extruded geometries (real volume, real shadows)
- Dynamic point lights per fighter (color = faction/cosmetic)
- Bloom post-processing for neon glow effect
- 3D particle system for hits, KO, dodge, parry
- Projectile beams with trail geometry
- Firewall shrink as rising red walls
- Audio engine integration (unchanged — same triggers)
- Responsive: works on mobile + desktop

## Scope — LATER (Phase 2+)
- Terrain with height variation (cover, elevation)
- Line of sight calculation from 3D scene → engine
- Obstacle meshes that block shots
- Environment props (data columns, server racks)
- Camera controls (zoom, rotate)
- Fighter animations (skeletal or morph targets)

## Architecture decision
The game engine (engine.ts) does NOT change. Three.js is a pure renderer:
```
engine.ts → GameState → Three.js arena → visual only
```
Phase 2 adds a feedback loop:
```
Three.js scene → spatial data → engine.ts (line of sight, cover)
```
We prepare the interface for Phase 2 but don't implement it now.

## Dependencies
- `three` (~150KB tree-shaken)
- `@react-three/fiber` (~40KB) — React renderer for Three.js
- `@react-three/drei` (~selective imports) — helpers (OrbitControls, effects, etc.)
- `@react-three/postprocessing` — bloom, chromatic aberration

## Status: proposed

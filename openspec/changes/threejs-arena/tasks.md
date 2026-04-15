# Tasks: Three.js Arena

## Bloque 1 — Setup + Camera + Grid (~15 min AI)
- [ ] Install three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
- [ ] Create arena3d/ directory structure
- [ ] Create index.tsx with R3F Canvas wrapper (receives same ArenaProps)
- [ ] Create camera.tsx — PerspectiveCamera (fov 50) + OrbitControls (rotate, zoom, pan, damping)
- [ ] Default camera at ~45° angle, min/max zoom 4-20, can't go below ground
- [ ] Create hex-grid.tsx — InstancedMesh with hex tile geometry, emissive cyan edges, pulse animation
- [ ] Create utils.ts — gridToWorld conversion, shape→geometry mapping
- [ ] Swap <Arena> for <Arena3D> in page.tsx
- [ ] Verify: grid renders, camera rotates/zooms, mobile touch works

## Bloque 2 — Fighters 3D (~15 min AI)
- [ ] Create fighter-3d.tsx — 3D mesh per RunnerShape (extruded geometries)
- [ ] Map all 8 shapes: diamond, triangle, hexagon, pentagon, star, cross, circle, square
- [ ] MeshStandardMaterial with cosmetic color + emissive + metalness
- [ ] Position interpolation (lerp in useFrame toward grid target)
- [ ] Breathing animation (Y oscillation + slow rotation)
- [ ] PointLight per fighter (color = cosmetic, illuminates nearby tiles)
- [ ] Shadow: castShadow on fighters, receiveShadow on ground
- [ ] State effects: block shield, parry lightning, charge ring, stun glitch, 2x badge
- [ ] HP bar as HTML overlay (drei Html component) or sprite

## Bloque 3 — Attacks + Particles (~15 min AI)
- [ ] Create projectiles-3d.tsx — beam mesh traveling A→B with trail
- [ ] Create particles-3d.tsx — 3D particle burst (Points geometry or instanced boxes)
- [ ] Punch: orange particle burst at target (30 particles)
- [ ] Heavy: shockwave torus + larger burst (60 particles) + camera shake
- [ ] Shoot: beam cylinder + electric trail + impact ring on hit
- [ ] KO: fighter shatters into fragments (50 pieces) + camera shake + flash
- [ ] Dodge: wireframe ghost afterimage + cyan particles
- [ ] Parry: electric arc lines around fighter

## Bloque 4 — Lighting + Post-Processing (~10 min AI)
- [ ] Create lights.tsx — AmbientLight + DirectionalLight (shadows)
- [ ] Create effects.tsx — EffectComposer with Bloom + Vignette
- [ ] Bloom: intensity 1.5, threshold 0.6 (makes emissive materials glow)
- [ ] Optional ChromaticAberration (subtle, desktop only)
- [ ] Firewall: red emissive walls rising from edges when bounds shrink

## Bloque 5 — Audio Integration + Polish (~10 min AI)
- [ ] Connect audio.play() to same log event processing as particles
- [ ] Ambient drone start/stop synced with battle
- [ ] Camera shake via small position offset on DirectionalLight or camera
- [ ] Mobile: detect and reduce particle count + disable chromatic aberration
- [ ] Responsive zoom: adjust camera zoom based on canvas size

## Bloque 6 — Fallback + Cleanup (~5 min AI)
- [ ] Keep old Canvas arena as arena-canvas/ (fallback)
- [ ] Clean up imports in page.tsx
- [ ] Verify build passes
- [ ] Test desktop + mobile

## Test
- [ ] Grid renders in 3D, camera orbits freely
- [ ] Fighters at correct positions, smooth movement
- [ ] All 8 shapes render as 3D geometries
- [ ] Attacks produce visible effects (particles, beams, shockwaves)
- [ ] Bloom makes neon elements glow
- [ ] Shadows visible on ground plane
- [ ] Audio synced with visual effects
- [ ] Mobile: runs at 30+ fps
- [ ] Firewall shrink visible as red walls
- [ ] KO produces spectacular shatter + flash

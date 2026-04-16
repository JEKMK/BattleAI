# Tasks: Arena Visual Overhaul

## Bloque 1 — Crystal-Mercury Fighters (~30 min AI)
- [ ] Replace solid mesh with dual-layer: outer MeshDistortMaterial + inner MeshTransmissionMaterial
- [ ] IcosahedronGeometry with subdivisions as distort base (smooth deformation)
- [ ] Inner core uses fighter shape geometry at 70% scale
- [ ] HP-reactive: distort speed/amount + chromatic aberration increase as HP drops
- [ ] Stun: max distortion + opacity flicker
- [ ] Block: ior boost (diamond-like crystalline shell)
- [ ] Fighter pointlight color matches state

## Bloque 2 — Bezier Cable Attacks (~45 min AI)
- [ ] Replace straight beam with CubicBezierCurve3 + TubeGeometry cables
- [ ] Shoot: 4-6 writhing bezier cables from attacker → target
- [ ] Cable control points shift each frame (tentacle movement)
- [ ] Glowing sphere travels along each cable (getPointAt(t))
- [ ] Hit: cables flash white, data pulse back
- [ ] Miss: cables dissolve into particles
- [ ] Punch: 6-8 short thick tentacles, extend/retract fast
- [ ] Heavy: charge spiral + exploding cables + shockwave ring
- [ ] Parry: crystalline shell + reflected cables

## Bloque 3 — Orbital Implants (~30 min AI)
- [ ] Load equipped implants for each fighter (pass from page.tsx)
- [ ] Per implant: small mesh orbiting fighter at radius 0.7-0.9
- [ ] Each orbital has Trail (drei) for light streak
- [ ] Geometry/color per implant type
- [ ] Stims: pulsing opacity that fades
- [ ] Evenly distributed phase offsets around fighter

## Bloque 4 — Reflective Floor + Reactive Tiles (~15 min AI)
- [ ] Replace ground plane with MeshReflectorMaterial (black mirror)
- [ ] On hit: tile at impact position flashes bright
- [ ] Adjacent tiles flash with delay = expanding wave effect
- [ ] Flash decays over 8 frames

## Bloque 5 — Polish + Integration (~10 min AI)
- [ ] Ensure bloom interacts well with new materials (may need threshold adjustment)
- [ ] Transmission material performance check (may need lower resolution on mobile)
- [ ] Pass implant loadout data through arena props
- [ ] Build + test

## Test
- [ ] Fighters look like crystal/mercury entities (translucent, refractive)
- [ ] Distortion increases visually as HP drops
- [ ] Attacks show bezier cables writhing between fighters
- [ ] Hit cables flash, miss cables dissolve
- [ ] Implants orbit as mini-meshes with light trails
- [ ] Floor reflects fighters and effects
- [ ] Tile flash wave on impact
- [ ] 30+ fps on mobile with all effects

# Proposal: Arena Visual Overhaul — Crystal Fighters, Bezier Hacking, Orbital Builds

## User value anchor
The arena looks like a tech demo, not a cyberpunk spectacle. Fighters are static geometry. Attacks are straight lines. Implants are invisible. We have Three.js + Drei with materials that create mercury, crystal, distortion, and reflections — and we're not using any of them. This change transforms every visual element to make battles look like a sci-fi movie.

## User stories
- As a runner, I want my fighter to look like a living alien crystal entity, not a flat shape
- As a runner, I want to SEE my implants orbiting my construct so my build has visual identity
- As a runner, I want attacks to look like hacking attempts — cables, exploits, data streams
- As a spectator, I want the arena floor to reflect the action like a black mirror

## 5 Visual Systems

### 1. Crystal-Mercury Fighters (MeshTransmissionMaterial + MeshDistortMaterial)
Fighters become translucent crystal entities that refract light, with surfaces that mutate organically. Chromatic aberration on edges. Distortion increases as HP drops — the construct destabilizes visually.

### 2. Bezier Cable Attacks (TubeGeometry + CubicBezierCurve3)
Attacks are hacking attempts: curved cables/tentacles reaching from attacker to target. Punch = short tentacles grabbing. Shoot = long bezier data stream. Heavy = expanding shockwave. On hit: cables connect, data flows. On miss: cables retract with sparks.

### 3. Orbital Implants (Float + Trail)
Each equipped implant is a mini-mesh orbiting the fighter. Visible to everyone. Different geometry per implant type. Trail effect behind each orbital. Stims pulse and fade over their duration.

### 4. Reflective Arena Floor (MeshReflectorMaterial)
Replace the flat dark ground with a reflective black mirror surface. Fighters and effects reflect on it. Cyberpunk aesthetic for free — one material swap.

### 5. Reactive Arena (tiles pulse on impact)
When a hit lands, nearby hex tiles flash and pulse outward in a wave. The arena RESPONDS to combat. Living battlefield.

## Scope — NOW
All 5 systems. ~2h AI time. All use Drei components — minimal custom code.

## Status: proposed

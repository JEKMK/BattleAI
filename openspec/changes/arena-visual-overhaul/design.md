# Design: Arena Visual Overhaul

## 1. Crystal-Mercury Fighters

### Material stack (two layers per fighter)

**Outer shell — MeshDistortMaterial:**
```jsx
<mesh>
  <icosahedronGeometry args={[0.4, 4]} />  // high-poly for smooth distortion
  <MeshDistortMaterial
    color={fighterColor}
    emissive={fighterColor}
    emissiveIntensity={0.3}
    speed={2 + (1 - hpRatio) * 4}    // faster mutation at low HP
    distort={0.2 + (1 - hpRatio) * 0.5}  // more chaotic at low HP
    metalness={0.8}
    roughness={0.2}
    transparent
    opacity={0.5}
  />
</mesh>
```

**Inner core — MeshTransmissionMaterial:**
```jsx
<mesh>
  <fighterGeometry />  // same shape but smaller (70% scale)
  <MeshTransmissionMaterial
    transmission={0.85}
    thickness={0.5}
    chromaticAberration={0.15 + (1 - hpRatio) * 0.4}  // more glitch at low HP
    distortion={0.3}
    temporalDistortion={0.1 + (1 - hpRatio) * 0.3}
    ior={1.5}
    color={fighterColor}
    roughness={0.1}
  />
</mesh>
```

**HP-reactive behavior:**
- Full HP: calm, smooth, minimal distortion
- 50% HP: distortion increases, chromatic aberration rises
- 25% HP: chaotic mutation, heavy aberration, flickering opacity
- Stun: maximum distortion + opacity flicker

### Shape selection
Use IcosahedronGeometry with subdivisions as base for distort (smoother deformation). The fighter "shape" selection (triangle, diamond, etc.) affects the inner core geometry — the outer distort shell is always smooth icosahedron.

## 2. Bezier Cable Attacks

### Shoot (remote exploit)
```
4-6 bezier curves from attacker → target:
  
  const curves = Array(5).map(() => {
    const ctrl1 = attackerPos.clone().add(randomOffset(1.5));
    const ctrl2 = targetPos.clone().add(randomOffset(1.5));
    return new CubicBezierCurve3(attackerPos, ctrl1, ctrl2, targetPos);
  });
  
  Each curve → TubeGeometry(curve, 20, 0.015, 4)
  Material: emissive faction color, additive blending
  
  Animation: control points shift each frame (cables writhe)
  Travel: a glowing sphere travels along each curve (getPointAt(t))
  
  On HIT: cables flash white, data pulse travels back
  On MISS: cables dissolve into particles
```

### Punch (direct exploit)
```
6-8 short bezier tentacles from attacker reaching toward target:
  
  Length: only 1-2 units (short range)
  Faster animation (extend + retract in ~8 frames)
  Thicker tubes (0.03 radius)
  
  On HIT: tentacles connect, red pulse, target glitches
  On MISS: tentacles snap back, sparks at tips
```

### Heavy (DDOS/overflow)
```
Phase 1 (charge): ring of cables spiraling around attacker
Phase 2 (release): all cables EXPLODE outward toward target
  + expanding shockwave ring (TorusGeometry scaling up)
  + ground tiles pulse in expanding wave from impact point
```

### Parry (BLACK ICE)
```
Fighter wraps in crystalline icosahedron shell:
  MeshTransmissionMaterial with ior=2.0 (diamond-like)
  When enemy attacks connect → cables REFLECT back
  Reflected cables hit attacker → stun sparks
```

## 3. Orbital Implants

```
Per equipped implant:
  - Small geometry (sphere 0.06, or matching implant icon shape)
  - Orbits fighter at radius 0.7-0.9
  - Each orbital has different phase offset (spread evenly)
  - Trail component from drei behind each orbital
  - Emissive color based on implant type

const IMPLANT_ORBITALS = {
  gorilla_arms:     { geo: "box",     color: "#ff6b00", size: 0.06 },
  kiroshi_optics:   { geo: "sphere",  color: "#00f0ff", size: 0.05 },
  subdermal_armor:  { geo: "octahedron", color: "#39ff14", size: 0.06 },
  neural_processor: { geo: "icosahedron", color: "#b44aff", size: 0.05 },
  // ... etc for all implants
};

Stims: same but with pulsing opacity that fades over their duration.
```

**Implementation: drei Float + Trail:**
```jsx
<Float speed={2} rotationIntensity={0.5} floatIntensity={0.3}>
  <Trail width={0.5} length={6} color={orbitalColor} attenuation={(t) => t * t}>
    <mesh position={[orbitRadius * cos(time + phase), 0, orbitRadius * sin(time + phase)]}>
      <sphereGeometry args={[0.05]} />
      <meshBasicMaterial color={color} />
    </mesh>
  </Trail>
</Float>
```

## 4. Reflective Arena Floor

```jsx
<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
  <planeGeometry args={[30, 30]} />
  <MeshReflectorMaterial
    blur={[400, 100]}
    resolution={512}
    mixBlur={1}
    mixStrength={0.4}
    roughness={0.85}
    depthScale={1.2}
    color="#050515"
    metalness={0.5}
  />
</mesh>
```

Replaces the current opaque ground plane. Fighters + effects + items reflect on the surface. Massive visual upgrade for 1 component swap.

## 5. Reactive Arena Tiles

When a hit lands at position (x, y):
- The hex tile at (x, y) flashes bright (emissive intensity → 1.0, decay over 8 frames)
- Adjacent tiles flash at reduced intensity (0.5) with 2-frame delay
- Next ring at 0.25 intensity, 4-frame delay
- Creates expanding "wave" effect from impact point

Implementation: store `tileFlashes: Map<string, { intensity: number, delay: number }>` in arena state. In useFrame, tick down delays, then fade intensities. Apply to InstancedMesh color per tile.

## Files to modify

- `src/components/arena3d/fighter-3d.tsx` — complete rewrite with Drei materials + orbitals
- `src/components/arena3d/projectiles-3d.tsx` — bezier cables instead of straight beams
- `src/components/arena3d/hex-grid.tsx` — reactive tile flashes + MeshReflectorMaterial floor
- `src/components/arena3d/index.tsx` — pass implant data to fighters

## Dependencies already installed
- `@react-three/drei` — MeshDistortMaterial, MeshTransmissionMaterial, MeshReflectorMaterial, Float, Trail, Sparkles
- `@react-three/postprocessing` — Bloom (already using)
- `three` — CubicBezierCurve3, TubeGeometry

No new dependencies needed.

# Design: Three.js Arena

## Architecture

```
GameState (from engine.ts)
    │
    ▼
┌────────────────────────────────────┐
│    Arena3D Component (R3F)         │
│                                    │
│  ┌──────────┐  ┌──────────────┐   │
│  │ <Canvas> │  │ useFrame()   │   │
│  │  R3F     │  │ animation    │   │
│  │  renderer│  │ loop         │   │
│  └──────────┘  └──────────────┘   │
│                                    │
│  Children:                         │
│  ├─ <IsoCamera />                  │
│  ├─ <Lights />                     │
│  ├─ <HexGrid tiles={...} />       │
│  ├─ <Fighter3D state={red} />     │
│  ├─ <Fighter3D state={blue} />    │
│  ├─ <Projectiles3D />             │
│  ├─ <Particles3D />               │
│  ├─ <Effects /> (bloom, etc)      │
│  └─ <Firewall bounds={...} />     │
│                                    │
│  Audio hooks into same log events  │
└────────────────────────────────────┘
```

## Camera: Free 3D with OrbitControls

```typescript
// PerspectiveCamera — real 3D depth
<PerspectiveCamera
  makeDefault
  position={[8, 8, 8]}   // start at classic iso-ish angle
  fov={50}
  near={0.1}
  far={100}
/>

// OrbitControls — player can rotate, zoom, pan
<OrbitControls
  target={[0, 0, 0]}       // look at grid center
  minDistance={4}           // can't zoom inside the grid
  maxDistance={20}          // can't zoom too far out
  maxPolarAngle={Math.PI / 2.2}  // can't go below ground
  minPolarAngle={0.3}      // can't go full top-down
  enablePan={true}          // drag to move
  enableDamping={true}      // smooth camera movement
  dampingFactor={0.08}
/>
```

PerspectiveCamera (not Orthographic) gives real 3D depth — close objects larger, far objects smaller. OrbitControls lets the player explore the arena like a strategy game. Default angle is ~45° but player can rotate freely.

Mobile: touch to rotate (1 finger), pinch to zoom (2 fingers), two-finger drag to pan.

## Grid: 3D Hex Tiles

```
Each tile is a thin CylinderGeometry(6 sides) or custom ExtrudeGeometry:
- Radius: 0.5 world units
- Height: 0.05 (thin, almost flat)
- Material: MeshStandardMaterial with emissive edges
- Edge glow: cyan emissive, pulsing with time
- Out-of-bounds tiles: red emissive, higher opacity

Grid positioned at Y=0 (ground plane).
```

Alternative: InstancedMesh for all tiles (one draw call, massive perf gain).

```typescript
// 80 tiles (10x8) as InstancedMesh = 1 draw call instead of 80
<instancedMesh ref={meshRef} args={[geometry, material, tileCount]}>
  // Set transforms per tile in useFrame
</instancedMesh>
```

## Fighters: Extruded 3D Shapes

```
Each RunnerShape maps to a Three.js geometry:

  diamond   → custom ExtrudeGeometry (diamond cross-section, 0.3 height)
  triangle  → ConeGeometry(3 sides)
  hexagon   → CylinderGeometry(6 sides)
  pentagon  → CylinderGeometry(5 sides)
  star      → custom ExtrudeGeometry (star cross-section)
  cross     → custom ExtrudeGeometry (cross cross-section)
  circle    → SphereGeometry
  square    → BoxGeometry (rotated 45° on Y)

Material: MeshStandardMaterial
  - color: cosmetic color
  - emissive: cosmetic color * 0.3 (self-glow)
  - metalness: 0.7
  - roughness: 0.3
  → gives cyberpunk metallic sheen

Position: grid coords → world coords, Y = 0.3 (floating above grid)
Shadow: castShadow = true, ground plane receiveShadow = true

Point light per fighter:
  - color: fighter color
  - intensity: 2
  - distance: 3
  → illuminates surrounding tiles naturally
```

## Position interpolation

```typescript
// In useFrame, lerp toward target position
const targetPos = gridToWorld(fighter.x, fighter.y);
meshRef.current.position.lerp(targetPos, 0.15);

// Breathing animation
meshRef.current.position.y = 0.3 + Math.sin(clock * 2) * 0.05;
meshRef.current.rotation.y += 0.005; // slow spin
```

## Grid coordinate mapping

```typescript
// Convert engine grid (x, y) to Three.js world coords
function gridToWorld(gridX: number, gridY: number): Vector3 {
  // Iso-style offset: odd rows shift by half
  const offsetX = gridY % 2 === 1 ? 0.5 : 0;
  return new Vector3(
    gridX + offsetX - arenaW / 2,  // center grid at origin
    0,                              // ground plane
    gridY * 0.866 - arenaH / 2     // hex row spacing (sqrt(3)/2)
  );
}
```

## Attacks & Effects

### Projectiles (shoot/spike)
```
Thin cylinder mesh traveling from A to B:
- Geometry: CylinderGeometry(0.02, 0.02, length)
- Material: emissive color, full bright
- Trail: multiple smaller cylinders fading behind
- On hit: sphere expanding + particle burst
- On miss: small fizzle particles
```

### Punch (burn)
```
Burst of box particles at target:
- 20-40 small BoxGeometry flying outward
- Color: orange/amber
- Fade out over 0.5s
- Optional: shockwave ring (torus expanding)
```

### Heavy (hammer)
```
Shockwave ring expanding from target:
- TorusGeometry, scaling up rapidly
- Emissive amber/red
- Screen shake (camera position wobble)
- More particles than punch (60-80)
```

### Block (shield)
```
Transparent hexagonal shield mesh in front of fighter:
- CylinderGeometry(6 sides, thin)
- Material: transparent cyan, emissive
- Appears with scale-in animation
- Rotates slowly
```

### Dodge (ghost)
```
Fighter goes transparent (opacity 0.3):
- Clone mesh with wireframe material
- Ghost afterimage at previous position (fades)
- Cyan particle trail
```

### Parry (black ice)
```
Electric arcs around fighter:
- Line geometries with random vertices
- Regenerated each frame (looks like lightning)
- Magenta emissive
- On successful counter: flash + stun particles on enemy
```

### KO (flatline)
```
Fighter "shatters":
- Replace mesh with 50 small fragment meshes
- Each fragment: random velocity + gravity
- Fade out over 1s
- Camera shake (big)
- Flash: bright white ambient light pulse
```

## Post-Processing

```typescript
<EffectComposer>
  <Bloom
    intensity={1.5}
    luminanceThreshold={0.6}
    luminanceSmoothing={0.9}
  />
  <ChromaticAberration offset={[0.0005, 0.0005]} />  // subtle
  <Vignette eskil={false} offset={0.1} darkness={0.8} />
</EffectComposer>
```

Bloom makes everything with emissive material GLOW automatically. No manual glow rendering needed.

## Lighting

```
1x AmbientLight: intensity 0.15, color #1a1a2e (very dim blue)
2x Fighter PointLight: color = fighter color, intensity 2
1x DirectionalLight: for shadows, from above-right
Optional: SpotLight on action target during attacks
```

## Responsive / Mobile

```
- Canvas fills container (R3F default)
- Zoom adjusts based on viewport: smaller screen = less zoom
- Reduce particle count on mobile (detect via navigator.maxTouchPoints)
- Disable ChromaticAberration on mobile
- Bloom intensity lower on mobile
- InstancedMesh keeps draw calls minimal (good for mobile GPU)
```

## File structure

```
src/components/arena3d/
├── index.tsx           — main <Canvas> wrapper + state management
├── camera.tsx          — PerspectiveCamera + OrbitControls
├── hex-grid.tsx        — InstancedMesh tile grid
├── fighter-3d.tsx      — 3D fighter mesh + animations
├── projectiles-3d.tsx  — beam/trail meshes
├── particles-3d.tsx    — 3D particle system
├── effects.tsx         — bloom, vignette, chromatic aberration
├── firewall.tsx        — shrinking bounds walls
├── lights.tsx          — scene lighting
└── utils.ts            — gridToWorld, shape→geometry mapping
```

## What stays the same
- `src/lib/engine.ts` — zero changes
- `src/lib/types.ts` — zero changes
- `src/lib/audio.ts` — same audio engine, same triggers
- `src/app/page.tsx` — swaps `<Arena>` for `<Arena3D>`, same props
- All API routes — untouched

## What gets replaced
- `src/components/arena/` (Canvas 2D) → `src/components/arena3d/` (Three.js)
- Old arena kept as fallback (rename to arena-canvas/)

## Performance budget

```
TARGET: 60fps desktop, 30fps mobile

Three.js with:
- InstancedMesh grid: 1 draw call
- 2 fighter meshes: 2 draw calls
- Particles as Points: 1 draw call
- Post-processing: 3 passes

Total draw calls: ~8 (vs Canvas 2D's thousands of fillRect)
Actually FASTER than Canvas 2D for complex scenes.
```

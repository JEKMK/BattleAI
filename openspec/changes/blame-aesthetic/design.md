# Design: Blame! Aesthetic

## 1. CSS Color Token Swap (globals.css)

The entire UI color system changes at the root level. Every component that uses semantic tokens automatically transforms.

```css
/* BEFORE (cyberpunk neon) */
--neon-green: #39ff14;
--cyan: #00f0ff;
--magenta: #ff2d6a;
--amber: #ffb800;
--bg-deep: #0a0a12;
--bg-panel: #0d0d1a;
--bg-surface: #12121f;
--bg-elevated: #1a1a2a;
--border: #1a1a2e;
--border-bright: #2a2a4a;
--text-primary: #e0e0f0;
--text-secondary: #a0a0c0;
--text-dim: #4a4a6e;

/* AFTER (Blame! industrial) */
--neon-green: #c45a1a;        /* rust orange — was neon green */
--cyan: #8a8070;              /* dirty metal — was bright cyan */
--magenta: #8b1a1a;           /* dried blood — was hot pink */
--amber: #c4821a;             /* warm amber — stays similar */
--bg-deep: #080706;           /* near black, warm */
--bg-panel: #0e0c0a;          /* dark metal */
--bg-surface: #141210;        /* oxidized surface */
--bg-elevated: #1a1714;       /* rusted panel */
--border: #1f1a14;            /* rust border */
--border-bright: #2f2518;     /* visible rust edge */
--text-primary: #c8c0b0;      /* off-white, aged */
--text-secondary: #8a8070;    /* weathered grey */
--text-dim: #4a4038;          /* dark rust */
```

Faction colors also change:
```css
--faction-anthropic: #8b1a1a;   /* was purple → blood red */
--faction-google: #c45a1a;      /* was cyan → rust orange */
--faction-openai: #6a6a5a;      /* was green → gunmetal */
```

## 2. Arena 3D Post-Processing

### Blame! shader chain
```jsx
<EffectComposer>
  {/* Desaturate — kill the color, Blame is near-monochrome */}
  <HueSaturation saturation={-0.7} />
  
  {/* Sepia/rust tone */}
  <ColorAverage blendFunction={BlendFunction.SOFT_LIGHT} />
  
  {/* High contrast — dark darks, bright brights */}
  <BrightnessContrast brightness={-0.1} contrast={0.3} />
  
  {/* Film grain — aged, industrial feel */}
  <Noise opacity={0.08} />
  
  {/* Bloom — but LESS than before, only weapon flashes */}
  <Bloom intensity={0.8} luminanceThreshold={0.7} />
  
  {/* Vignette — heavy, oppressive */}
  <Vignette eskil={false} offset={0.2} darkness={1.0} />
</EffectComposer>
```

### Lighting overhaul
```jsx
{/* Kill the blue ambient — replace with near-dark warm */}
<ambientLight intensity={0.06} color="#1a1208" />

{/* Industrial overhead — harsh, directional */}
<directionalLight position={[5, 15, 3]} intensity={0.3} color="#c4821a" castShadow />

{/* Red warning lights at grid edges */}
<pointLight position={[-6, 2, -6]} intensity={0.3} color="#8b1a1a" distance={8} />
<pointLight position={[6, 2, 6]} intensity={0.3} color="#8b1a1a" distance={8} />
```

### Hex grid — dark metal
```
Material: MeshStandardMaterial
  color: "#0a0908"        (near-black metal)
  emissive: "#1a1208"     (barely visible warm edge)
  emissiveIntensity: 0.05 (almost dark)
  metalness: 0.95         (full metal)
  roughness: 0.7          (brushed, not mirror)

Edge lines: #2a1f15 at 0.2 opacity (barely visible grid)
Out-of-bounds: #1a0808 with red edge tint
```

### Fog — dense industrial haze
```jsx
<fog attach="fog" args={["#0a0806", 3, 14]} />
```
Closer than before, warm brown-grey instead of clean black. Things disappear into murky haze.

### Atmosphere replacement
- **Matrix rain → Spark showers**: random downward orange sparks (like welding debris)
- **Data columns → Metal pillars**: dark cylinders with rust texture, occasional spark at base
- **Light wisps → Floating embers**: tiny orange dots drifting slowly, dying out
- **Ground grid → Metal floor grating**: dark grid, barely visible, metallic

### Fighters
Keep geometric shapes but change materials:
```
Outer shell:
  MeshDistortMaterial
  color: "#1a1714"          (dark metal)
  emissive: "#8b1a1a"       (dim red glow from within)
  metalness: 0.9
  roughness: 0.5

Inner core:
  color: "#c45a1a"          (rust orange — the "life" of the construct)
  emissive: "#c45a1a"
  emissiveIntensity: 0.6

Fighter lights:
  color: "#c45a1a" or "#8b1a1a" (orange/red, no more cyan/green)
```

At low HP: inner core dims, outer shell cracks (distort increases), red warning flashes.

### Attacks — Graviton Beam Emitter style
Blame!'s GBE doesn't fire a laser — it ERASES a line through reality. The beam is white-hot and the surrounding area goes dark in contrast.

```
Cable color: "#ffffff" core + "#c45a1a" outer glow
On impact: WHITE FLASH fills screen for 2 frames (bloom spikes to 3.0 briefly)
           Then darkness. The impact point stays glowing for 30 frames.
           Debris particles: grey/orange metal fragments.
```

## 3. CRT Effects → Film Grain

Replace current CRT scanlines with:
- Film grain noise (css: background-image with noise SVG, animated)
- Subtle flicker (opacity 0.98-1.0 random)
- NO green scanlines — that's retro computer, not Blame!

## Files to modify

### CSS
- `src/app/globals.css` — complete color token swap + remove CRT effects + add grain

### Arena 3D
- `src/components/arena3d/effects.tsx` — Blame! post-processing chain
- `src/components/arena3d/lights.tsx` — industrial lighting
- `src/components/arena3d/hex-grid.tsx` — dark metal grid + fog color
- `src/components/arena3d/atmosphere.tsx` — sparks/embers/pillars replace neon
- `src/components/arena3d/fighter-3d.tsx` — dark metal + red core
- `src/components/arena3d/projectiles-3d.tsx` — white-hot GBE beams
- `src/components/arena3d/particles-3d.tsx` — grey/orange debris

### UI Components
- All terminal components use CSS tokens so they auto-transform with globals.css
- No individual component changes needed IF tokens are correct

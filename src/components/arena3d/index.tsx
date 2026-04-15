"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import type { GameState, RunnerShape } from "@/lib/types";
import { Camera } from "./camera";
import { Lights } from "./lights";
import { HexGrid } from "./hex-grid";
import { Fighter3D } from "./fighter-3d";
import { Effects } from "./effects";

interface FighterCosmetic {
  shape: RunnerShape;
  color: string;
}

interface Arena3DProps {
  state: GameState | null;
  redCosmetic?: FighterCosmetic;
  blueCosmetic?: FighterCosmetic;
}

export function Arena3D({ state, redCosmetic, blueCosmetic }: Arena3DProps) {
  const arenaW = state?.arena.width ?? 10;
  const arenaH = state?.arena.height ?? 8;
  const [red, blue] = state?.fighters ?? [null, null];

  return (
    <div className="w-full" style={{ aspectRatio: "16 / 10", maxWidth: "800px" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Camera arenaW={arenaW} arenaH={arenaH} />
          <Lights />

          <HexGrid arenaW={arenaW} arenaH={arenaH} bounds={state?.bounds} />

          {red && (
            <Fighter3D
              fighter={red}
              shape={redCosmetic?.shape ?? "triangle"}
              color={redCosmetic?.color ?? "#00f0ff"}
              arenaW={arenaW}
              arenaH={arenaH}
            />
          )}

          {blue && (
            <Fighter3D
              fighter={blue}
              shape={blueCosmetic?.shape ?? "square"}
              color={blueCosmetic?.color ?? "#39ff14"}
              arenaW={arenaW}
              arenaH={arenaH}
            />
          )}

          <Effects />

          {/* Fog for atmosphere */}
          <fog attach="fog" args={["#050510", 8, 25]} />
        </Suspense>
      </Canvas>
    </div>
  );
}

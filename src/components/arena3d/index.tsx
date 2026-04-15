"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import type { GameState, RunnerShape } from "@/lib/types";
import { Camera } from "./camera";
import { Lights } from "./lights";
import { HexGrid } from "./hex-grid";
import { Fighter3D } from "./fighter-3d";
import { Particles3D, spawnParticles3D } from "./particles-3d";
import { Projectiles3D, spawnBeam } from "./projectiles-3d";
import { Effects } from "./effects";
import { gridToWorld } from "./utils";
import { audioEngine } from "@/lib/audio";

const FACTION_COLORS: Record<string, string> = {
  anthropic: "#b44aff",
  google: "#00f0ff",
  openai: "#39ff14",
};

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
  const prevTickRef = useRef(-1);

  // Process tick logs — spawn particles, beams, audio
  useEffect(() => {
    if (!state || state.tick === prevTickRef.current) return;
    prevTickRef.current = state.tick;

    const tickLogs = state.log.filter((l) => l.tick === state.tick);
    const [redF, blueF] = state.fighters;

    for (const log of tickLogs) {
      if (log.type === "move") continue;

      const fighter = log.fighter === "red" ? redF : blueF;
      const target = log.fighter === "red" ? blueF : redF;
      const pos = gridToWorld(log.x ?? fighter.x, log.y ?? fighter.y, arenaW, arenaH);

      // Audio
      switch (log.type) {
        case "hit": audioEngine.play(log.message.includes("Hammer") ? "heavy" : log.message.includes("Spike") ? "shoot" : "punch"); break;
        case "miss": audioEngine.play("miss"); break;
        case "block": audioEngine.play("block"); break;
        case "dodge": audioEngine.play("dodge"); break;
        case "parry": audioEngine.play("parry"); break;
        case "stun": audioEngine.play("stun"); break;
        case "ko": audioEngine.play("ko"); break;
      }

      // Particles
      if (log.type === "hit") {
        const isHeavy = log.message.includes("Hammer");
        spawnParticles3D(pos.x, pos.y, pos.z, "#ffb800", isHeavy ? 50 : 25, isHeavy ? 0.2 : 0.12);
      } else if (log.type === "ko") {
        spawnParticles3D(pos.x, pos.y, pos.z, "#ff2d6a", 100, 0.25);
      } else if (log.type === "parry") {
        spawnParticles3D(pos.x, pos.y, pos.z, "#ff2d6a", 20, 0.1);
      } else if (log.type === "dodge") {
        spawnParticles3D(pos.x, pos.y, pos.z, "#00f0ff", 15, 0.08);
      } else if (log.type === "stun") {
        spawnParticles3D(pos.x, pos.y, pos.z, "#ff2d6a", 18, 0.1);
      }

      // Projectile beams for shoot/spike
      if ((log.type === "hit" || log.type === "miss") &&
        (log.message.includes("Spike") || log.message.includes("spike") || log.message.includes("scattered"))) {
        const dist = Math.abs(fighter.x - target.x) + Math.abs(fighter.y - target.y);
        if (dist > 2) {
          const from = gridToWorld(fighter.x, fighter.y, arenaW, arenaH);
          const to = gridToWorld(target.x, target.y, arenaW, arenaH);
          const fColor = FACTION_COLORS[fighter.faction] || "#39ff14";
          spawnBeam(from.x, from.y, from.z, to.x, to.y, to.z, fColor, log.type === "hit");
        }
      }
    }

    // Ambient tension
    if (state.status === "fighting") {
      audioEngine.updateTension(state.tick, redF.hp / redF.maxHp);
    }
  }, [state?.tick, arenaW, arenaH]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
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

          <Particles3D />
          <Projectiles3D />
          <Effects />
          <fog attach="fog" args={["#050510", 10, 30]} />
        </Suspense>
      </Canvas>
    </div>
  );
}

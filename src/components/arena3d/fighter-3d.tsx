import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Fighter, RunnerShape } from "@/lib/types";
import { gridToWorld, createFighterGeometry } from "./utils";

const FACTION_COLORS: Record<string, string> = {
  anthropic: "#b44aff",
  google: "#00f0ff",
  openai: "#39ff14",
};

interface Fighter3DProps {
  fighter: Fighter;
  shape: RunnerShape;
  color: string;
  arenaW: number;
  arenaH: number;
}

export function Fighter3D({ fighter, shape, color, arenaW, arenaH }: Fighter3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const targetPos = useRef(new THREE.Vector3());

  const geometry = useMemo(() => createFighterGeometry(shape), [shape]);

  const baseColor = color || FACTION_COLORS[fighter.faction] || "#ffffff";

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: baseColor,
    emissive: baseColor,
    emissiveIntensity: 0.4,
    metalness: 0.7,
    roughness: 0.3,
    transparent: fighter.isStunned,
    opacity: fighter.isStunned ? 0.5 : 1,
  }), [baseColor, fighter.isStunned]);

  // State effect color
  const stateColor = useMemo(() => {
    if (fighter.isStunned) return "#ff2d6a";
    if (fighter.isParrying) return "#ff2d6a";
    if (fighter.isBlocking) return "#00f0ff";
    if (fighter.charging) return "#ffb800";
    if (fighter.damageMultiplier > 1) return "#ff2d6a";
    return baseColor;
  }, [fighter.isStunned, fighter.isParrying, fighter.isBlocking, fighter.charging, fighter.damageMultiplier, baseColor]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    // Lerp to target grid position
    const target = gridToWorld(fighter.x, fighter.y, arenaW, arenaH);
    target.y = 0.35; // float above grid
    targetPos.current.copy(target);
    meshRef.current.position.lerp(targetPos.current, 0.12);

    // Breathing: gentle Y bob + slow rotation
    const t = clock.getElapsedTime();
    meshRef.current.position.y = 0.35 + Math.sin(t * 2) * 0.06;
    meshRef.current.rotation.y += 0.008;

    // Stun glitch: random offset
    if (fighter.isStunned) {
      meshRef.current.position.x += (Math.random() - 0.5) * 0.08;
      meshRef.current.position.z += (Math.random() - 0.5) * 0.08;
    }

    // Update material emissive to state color
    material.emissive.set(stateColor);
    material.emissiveIntensity = 0.3 + Math.sin(t * 3) * 0.15;

    // Point light follows fighter
    if (lightRef.current) {
      lightRef.current.position.copy(meshRef.current.position);
      lightRef.current.position.y += 0.5;
      lightRef.current.color.set(stateColor);
      lightRef.current.intensity = 1.5 + Math.sin(t * 3) * 0.5;
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        castShadow
        position={[0, 0.35, 0]}
      />

      {/* Dynamic point light per fighter */}
      <pointLight
        ref={lightRef}
        color={stateColor}
        intensity={2}
        distance={4}
        decay={2}
      />

      {/* Block shield */}
      {fighter.isBlocking && (
        <Shield position={meshRef.current?.position} />
      )}
    </group>
  );
}

function Shield({ position }: { position?: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !position) return;
    ref.current.position.copy(position);
    ref.current.rotation.y = clock.getElapsedTime() * 0.5;
  });

  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[0.6, 0.6, 0.02, 6]} />
      <meshStandardMaterial
        color="#00f0ff"
        emissive="#00f0ff"
        emissiveIntensity={0.8}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

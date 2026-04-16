"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ArenaItem } from "@/lib/types";
import { gridToWorld } from "./utils";

const ITEM_COLORS: Record<string, string> = {
  repair_kit: "#39ff14",
  firewall_boost: "#00f0ff",
  power_surge: "#ffb800",
  virus_trap: "#ff2d6a",
  emp_burst: "#b44aff",
  overclock: "#ffffff",
};

interface Items3DProps {
  items: ArenaItem[];
  arenaW: number;
  arenaH: number;
}

export function Items3D({ items, arenaW, arenaH }: Items3DProps) {
  return (
    <group>
      {items.map((item) => (
        <ItemMesh key={item.id} item={item} arenaW={arenaW} arenaH={arenaH} />
      ))}
    </group>
  );
}

function ItemMesh({ item, arenaW, arenaH }: { item: ArenaItem; arenaW: number; arenaH: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const color = ITEM_COLORS[item.type] || "#ffffff";
  const pos = gridToWorld(item.x, item.y, arenaW, arenaH);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    // Float + rotate + bounce
    meshRef.current.position.set(pos.x, 0.5 + Math.sin(t * 3) * 0.1, pos.z);
    meshRef.current.rotation.y = t * 1.5;
    meshRef.current.rotation.x = Math.sin(t * 2) * 0.2;

    // Fade out when despawning (last 3 ticks)
    const fadeAlpha = item.ticksLeft <= 3 ? item.ticksLeft / 3 : 1;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = fadeAlpha * 0.8;
    mat.emissiveIntensity = 0.5 + Math.sin(t * 4) * 0.3;

    // Glow follows
    if (glowRef.current) {
      glowRef.current.position.copy(meshRef.current.position);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = fadeAlpha * 0.12;
    }
    if (lightRef.current) {
      lightRef.current.position.copy(meshRef.current.position);
      lightRef.current.intensity = fadeAlpha * (1 + Math.sin(t * 4) * 0.5);
    }
  });

  const geometry = getItemGeometry(item.type);

  return (
    <group>
      {/* Core mesh */}
      <mesh ref={meshRef} position={[pos.x, 0.5, pos.z]} castShadow geometry={geometry}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.5}
          roughness={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Outer glow sphere */}
      <mesh ref={glowRef} position={[pos.x, 0.5, pos.z]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Point light */}
      <pointLight
        ref={lightRef}
        position={[pos.x, 0.7, pos.z]}
        color={color}
        intensity={1.5}
        distance={3}
        decay={2}
      />
    </group>
  );
}

function getItemGeometry(type: string): THREE.BufferGeometry {
  switch (type) {
    case "repair_kit": return new THREE.IcosahedronGeometry(0.15, 0);
    case "firewall_boost": return new THREE.OctahedronGeometry(0.15);
    case "power_surge": return new THREE.TetrahedronGeometry(0.18);
    case "virus_trap": return new THREE.BoxGeometry(0.2, 0.2, 0.2);
    case "emp_burst": return new THREE.TorusGeometry(0.12, 0.04, 8, 16);
    case "overclock": return new THREE.DodecahedronGeometry(0.15, 0);
    default: return new THREE.SphereGeometry(0.12, 8, 8);
  }
}

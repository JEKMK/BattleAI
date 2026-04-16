"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Trail, Float } from "@react-three/drei";
import * as THREE from "three";
import type { Fighter, RunnerShape } from "@/lib/types";
import { gridToWorld, createFighterGeometry } from "./utils";

const FACTION_COLORS: Record<string, string> = {
  anthropic: "#b44aff",
  google: "#00f0ff",
  openai: "#39ff14",
};

// Orbital definitions per implant
const IMPLANT_ORBITALS: Record<string, { color: string; size: number }> = {
  gorilla_arms: { color: "#ff6b00", size: 0.06 },
  kiroshi_optics: { color: "#00f0ff", size: 0.05 },
  subdermal_armor: { color: "#39ff14", size: 0.06 },
  neural_processor: { color: "#b44aff", size: 0.05 },
  mantis_blades: { color: "#ff2d6a", size: 0.06 },
  kerenzikov: { color: "#ffb800", size: 0.05 },
  sandevistan: { color: "#ff2d6a", size: 0.06 },
  projectile_system: { color: "#ff6b00", size: 0.05 },
  synaptic_booster: { color: "#00f0ff", size: 0.05 },
  monowire_jack: { color: "#b44aff", size: 0.05 },
};

interface Fighter3DProps {
  fighter: Fighter;
  shape: RunnerShape;
  color: string;
  arenaW: number;
  arenaH: number;
  implants?: string[];
  stims?: string[];
}

export function Fighter3D({ fighter, shape, color, arenaW, arenaH, implants = [], stims = [] }: Fighter3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const targetPos = useRef(new THREE.Vector3());

  const baseColor = color || FACTION_COLORS[fighter.faction] || "#ffffff";
  const hpRatio = fighter.hp / fighter.maxHp;
  const instability = 1 - hpRatio;

  const innerGeo = useMemo(() => createFighterGeometry(shape), [shape]);

  // State color
  const stateColor = useMemo(() => {
    if (fighter.isStunned) return "#ff2d6a";
    if (fighter.isParrying) return "#ff2d6a";
    if (fighter.isBlocking) return "#00f0ff";
    if (fighter.charging) return "#ffb800";
    if (fighter.damageMultiplier > 1) return "#ff2d6a";
    return baseColor;
  }, [fighter.isStunned, fighter.isParrying, fighter.isBlocking, fighter.charging, fighter.damageMultiplier, baseColor]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Lerp to target grid position
    const target = gridToWorld(fighter.x, fighter.y, arenaW, arenaH);
    target.y = 0.45;
    targetPos.current.copy(target);
    groupRef.current.position.lerp(targetPos.current, 0.12);

    // Breathing float
    groupRef.current.position.y = 0.45 + Math.sin(t * 2) * 0.08;

    // Slow rotation
    if (outerRef.current) outerRef.current.rotation.y += 0.008;
    if (innerRef.current) innerRef.current.rotation.y -= 0.005;

    // Stun: heavy jitter
    if (fighter.isStunned) {
      groupRef.current.position.x += (Math.random() - 0.5) * 0.12;
      groupRef.current.position.z += (Math.random() - 0.5) * 0.12;
    }

    // Low HP jitter
    if (hpRatio < 0.5) {
      groupRef.current.position.x += (Math.random() - 0.5) * instability * 0.04;
      groupRef.current.position.z += (Math.random() - 0.5) * instability * 0.04;
    }

    // Light follows
    if (lightRef.current) {
      lightRef.current.position.copy(groupRef.current.position);
      lightRef.current.position.y += 0.6;
      lightRef.current.color.set(stateColor);
      lightRef.current.intensity = 1.5 + Math.sin(t * 3) * 0.5 + instability;
    }
  });

  return (
    <group>
      <group ref={groupRef} position={[0, 0.45, 0]}>

        {/* OUTER SHELL — MeshDistortMaterial (organic mutation) */}
        <mesh ref={outerRef} castShadow>
          <icosahedronGeometry args={[0.42, 4]} />
          <MeshDistortMaterial
            color={stateColor}
            emissive={stateColor}
            emissiveIntensity={0.25 + instability * 0.3}
            speed={1.5 + instability * 5}
            distort={0.15 + instability * 0.5}
            metalness={0.85}
            roughness={0.15}
            transparent
            opacity={0.35 + hpRatio * 0.15}
          />
        </mesh>

        {/* INNER CORE — fighter shape, bright, solid-ish */}
        <mesh ref={innerRef} castShadow scale={0.65}>
          <primitive object={innerGeo} attach="geometry" />
          <meshStandardMaterial
            color={stateColor}
            emissive={stateColor}
            emissiveIntensity={0.6 + Math.sin(Date.now() * 0.003) * 0.2}
            metalness={0.7}
            roughness={0.2}
            transparent
            opacity={0.7 + hpRatio * 0.2}
          />
        </mesh>

        {/* BLOCK — crystalline shield dome */}
        {fighter.isBlocking && (
          <mesh scale={1.3}>
            <icosahedronGeometry args={[0.5, 1]} />
            <meshStandardMaterial
              color="#00f0ff"
              emissive="#00f0ff"
              emissiveIntensity={1.0}
              transparent
              opacity={0.12}
              wireframe
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* PARRY — electric crystalline shell */}
        {fighter.isParrying && (
          <mesh scale={1.2}>
            <octahedronGeometry args={[0.5]} />
            <meshStandardMaterial
              color="#ff2d6a"
              emissive="#ff2d6a"
              emissiveIntensity={1.5}
              transparent
              opacity={0.2}
              wireframe
            />
          </mesh>
        )}

        {/* CHARGING — expanding rings */}
        {fighter.charging && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.5, 0.02, 8, 32]} />
            <meshBasicMaterial
              color="#ffb800"
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}

        {/* ORBITAL IMPLANTS */}
        {implants.map((implantId, i) => {
          const orbital = IMPLANT_ORBITALS[implantId];
          if (!orbital) return null;
          const phase = (i / Math.max(implants.length, 1)) * Math.PI * 2;
          return (
            <OrbitalImplant
              key={implantId}
              color={orbital.color}
              size={orbital.size}
              radius={0.75}
              phase={phase}
              speed={1.2}
            />
          );
        })}

        {/* ORBITAL STIMS (pulsing, temporary) */}
        {stims.map((stimId, i) => (
          <OrbitalImplant
            key={`stim-${stimId}`}
            color="#ffb800"
            size={0.04}
            radius={0.6}
            phase={i * Math.PI + Math.PI / 4}
            speed={2.0}
            pulsing
          />
        ))}

        {/* 2x damage badge */}
        {fighter.damageMultiplier > 1 && (
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.05, 6, 6]} />
            <meshBasicMaterial color="#ff2d6a" />
          </mesh>
        )}
      </group>

      {/* HP ring on ground */}
      <HpRing fighter={fighter} arenaW={arenaW} arenaH={arenaH} color={baseColor} />

      {/* Point light */}
      <pointLight ref={lightRef} color={stateColor} intensity={2} distance={4} decay={2} />
    </group>
  );
}

/** Orbiting mini-mesh with trail */
function OrbitalImplant({ color, size, radius, phase, speed, pulsing = false }: {
  color: string; size: number; radius: number; phase: number; speed: number; pulsing?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    meshRef.current.position.set(
      Math.cos(t) * radius,
      Math.sin(t * 0.7) * 0.15,
      Math.sin(t) * radius,
    );
    if (pulsing) {
      meshRef.current.scale.setScalar(0.8 + Math.sin(clock.getElapsedTime() * 4) * 0.3);
    }
  });

  return (
    <Trail width={0.3} length={4} color={color} attenuation={(t) => t * t}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 6, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={pulsing ? 0.6 : 0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </Trail>
  );
}

/** HP ring on ground */
function HpRing({ fighter, arenaW, arenaH, color }: { fighter: Fighter; arenaW: number; arenaH: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const hpRatio = fighter.hp / fighter.maxHp;

  useFrame(() => {
    if (!ref.current) return;
    const pos = gridToWorld(fighter.x, fighter.y, arenaW, arenaH);
    ref.current.position.set(pos.x, 0.02, pos.z);
  });

  const ringColor = hpRatio > 0.5 ? "#39ff14" : hpRatio > 0.25 ? "#ffb800" : "#ff2d6a";

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.4 * hpRatio, 0.45, 32]} />
      <meshBasicMaterial
        color={ringColor}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

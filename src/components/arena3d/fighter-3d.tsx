"use client";

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
  const wireRef = useRef<THREE.LineSegments>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const targetPos = useRef(new THREE.Vector3());

  const baseColor = color || FACTION_COLORS[fighter.faction] || "#ffffff";
  const geometry = useMemo(() => createFighterGeometry(shape), [shape]);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  // State color
  const stateColor = useMemo(() => {
    if (fighter.isStunned) return "#ff2d6a";
    if (fighter.isParrying) return "#ff2d6a";
    if (fighter.isBlocking) return "#00f0ff";
    if (fighter.charging) return "#ffb800";
    if (fighter.damageMultiplier > 1) return "#ff2d6a";
    return baseColor;
  }, [fighter.isStunned, fighter.isParrying, fighter.isBlocking, fighter.charging, fighter.damageMultiplier, baseColor]);

  // Core material — semi-transparent energy
  const coreMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: baseColor,
    emissive: baseColor,
    emissiveIntensity: 0.6,
    metalness: 0.3,
    roughness: 0.2,
    transparent: true,
    opacity: 0.7,
  }), [baseColor]);

  // Wireframe material — energy grid lines
  const wireMat = useMemo(() => new THREE.LineBasicMaterial({
    color: baseColor,
    transparent: true,
    opacity: 0.9,
  }), [baseColor]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const hpRatio = fighter.hp / fighter.maxHp;

    // Lerp to target
    const target = gridToWorld(fighter.x, fighter.y, arenaW, arenaH);
    target.y = 0.4;
    targetPos.current.copy(target);
    meshRef.current.position.lerp(targetPos.current, 0.12);

    // Breathing + rotation
    meshRef.current.position.y = 0.4 + Math.sin(t * 2) * 0.06;
    meshRef.current.rotation.y += 0.01;

    // === DAMAGE VISUALIZATION ===
    // As HP drops: more transparent, more flickery, wireframe more visible
    const instability = 1 - hpRatio; // 0 = full HP, 1 = dying

    // Core becomes more transparent as HP drops
    coreMat.opacity = 0.3 + hpRatio * 0.5;
    coreMat.emissiveIntensity = 0.3 + hpRatio * 0.5;

    // Wireframe becomes more visible as construct destabilizes
    wireMat.opacity = 0.4 + instability * 0.6;

    // Low HP: flicker (random opacity drops)
    if (hpRatio < 0.3) {
      const flicker = Math.random() > 0.85 ? 0.2 : 1;
      coreMat.opacity *= flicker;
      wireMat.opacity *= flicker;
    }

    // Low HP: jitter position
    if (hpRatio < 0.5) {
      meshRef.current.position.x += (Math.random() - 0.5) * instability * 0.04;
      meshRef.current.position.z += (Math.random() - 0.5) * instability * 0.04;
    }

    // Scale pulses more wildly at low HP
    const breathScale = 1 + Math.sin(t * (2 + instability * 4)) * (0.03 + instability * 0.05);
    meshRef.current.scale.setScalar(breathScale);

    // Stunned: heavy glitch
    if (fighter.isStunned) {
      meshRef.current.position.x += (Math.random() - 0.5) * 0.1;
      meshRef.current.position.z += (Math.random() - 0.5) * 0.1;
      coreMat.opacity = 0.2 + Math.random() * 0.3;
    }

    // Update colors to state
    coreMat.color.set(stateColor);
    coreMat.emissive.set(stateColor);
    wireMat.color.set(stateColor);

    // Wireframe follows core
    if (wireRef.current) {
      wireRef.current.position.copy(meshRef.current.position);
      wireRef.current.rotation.copy(meshRef.current.rotation);
      wireRef.current.scale.copy(meshRef.current.scale);
    }

    // Light follows fighter
    if (lightRef.current) {
      lightRef.current.position.copy(meshRef.current.position);
      lightRef.current.position.y += 0.5;
      lightRef.current.color.set(stateColor);
      lightRef.current.intensity = 1 + hpRatio * 1.5 + Math.sin(t * 3) * 0.3;
    }

    // Shield
    if (shieldRef.current) {
      shieldRef.current.position.copy(meshRef.current.position);
      shieldRef.current.rotation.y = t * 0.3;
      shieldRef.current.visible = fighter.isBlocking;
    }
  });

  return (
    <group>
      {/* Core — semi-transparent energy body */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={coreMat}
        castShadow
        position={[0, 0.4, 0]}
      />

      {/* Wireframe overlay — energy grid structure */}
      <lineSegments
        ref={wireRef}
        geometry={edgesGeo}
        material={wireMat}
      />

      {/* Energy shield dome — full sphere */}
      <mesh ref={shieldRef} visible={false}>
        <sphereGeometry args={[0.7, 16, 12]} />
        <meshStandardMaterial
          color="#00f0ff"
          emissive="#00f0ff"
          emissiveIntensity={1.2}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          wireframe
        />
      </mesh>
      {/* Shield inner glow */}
      {fighter.isBlocking && (
        <mesh position={meshRef.current?.position ?? [0, 0.4, 0]}>
          <sphereGeometry args={[0.65, 12, 8]} />
          <meshBasicMaterial
            color="#00f0ff"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Parry lightning arcs */}
      {fighter.isParrying && <ParryArcs position={meshRef.current?.position} />}

      {/* Charging ring */}
      {fighter.charging && <ChargingRing position={meshRef.current?.position} />}

      {/* Dynamic light */}
      <pointLight
        ref={lightRef}
        color={stateColor}
        intensity={2}
        distance={4}
        decay={2}
      />

      {/* 2x badge */}
      {fighter.damageMultiplier > 1 && meshRef.current && (
        <sprite position={[meshRef.current.position.x, meshRef.current.position.y + 0.7, meshRef.current.position.z]} scale={[0.3, 0.15, 1]}>
          <spriteMaterial color="#ff2d6a" />
        </sprite>
      )}

      {/* HP indicator — ring on ground */}
      <HpRing
        position={meshRef.current?.position}
        hpRatio={fighter.hp / fighter.maxHp}
        color={baseColor}
      />
    </group>
  );
}

/** HP as a ground ring that shrinks with damage */
function HpRing({ position, hpRatio, color }: { position?: THREE.Vector3; hpRatio: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current || !position) return;
    ref.current.position.set(position.x, 0.02, position.z);
  });

  const ringColor = hpRatio > 0.5 ? "#39ff14" : hpRatio > 0.25 ? "#ffb800" : "#ff2d6a";

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.45 * hpRatio, 0.5, 32]} />
      <meshBasicMaterial
        color={ringColor}
        transparent
        opacity={0.4}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Electric arcs around fighter for parry state */
function ParryArcs({ position }: { position?: THREE.Vector3 }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !position) return;
    groupRef.current.position.copy(position);

    // Regenerate arcs each frame for lightning effect
    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children[0];
      groupRef.current.remove(child);
    }

    const t = clock.getElapsedTime();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 2;
      const points: THREE.Vector3[] = [];
      const segments = 4;
      for (let s = 0; s <= segments; s++) {
        const r = 0.3 + (s / segments) * 0.5;
        const jitterX = (Math.random() - 0.5) * 0.15;
        const jitterY = (Math.random() - 0.5) * 0.15;
        points.push(new THREE.Vector3(
          Math.cos(angle) * r + jitterX,
          jitterY,
          Math.sin(angle) * r + jitterX,
        ));
      }
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: "#ff2d6a",
        transparent: true,
        opacity: 0.6 + Math.random() * 0.4,
      });
      groupRef.current.add(new THREE.Line(lineGeo, lineMat));
    }
  });

  return <group ref={groupRef} />;
}

/** Pulsing ring for charging heavy */
function ChargingRing({ position }: { position?: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current || !position) return;
    ref.current.position.copy(position);
    const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 6) * 0.5;
    ref.current.scale.setScalar(0.8 + pulse * 0.4);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.3;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.55, 32]} />
      <meshBasicMaterial
        color="#ffb800"
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

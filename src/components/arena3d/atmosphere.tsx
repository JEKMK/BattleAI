"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Cyberspace atmosphere:
 * 1. Matrix code rain — vertical columns of falling characters
 * 2. Floating light wisps — orbs drifting through the scene
 * 3. Grid floor glow — infinite ground plane with fading grid
 * 4. Distant data columns — vertical pillars of light at edges
 */

// ═══════════════════════════════════════════
// MATRIX CODE RAIN — falling character columns
// ═══════════════════════════════════════════

const RAIN_COLUMNS = 40;
const CHARS_PER_COLUMN = 20;
const RAIN_SPREAD = 12; // how far from center
const RAIN_HEIGHT = 10;

export function MatrixRain() {
  const pointsRef = useRef<THREE.Points>(null);
  const maxCount = RAIN_COLUMNS * CHARS_PER_COLUMN;

  const { positions, velocities, offsets } = useMemo(() => {
    const pos = new Float32Array(maxCount * 3);
    const vel = new Float32Array(maxCount);
    const off = new Float32Array(maxCount);

    for (let col = 0; col < RAIN_COLUMNS; col++) {
      const x = (Math.random() - 0.5) * RAIN_SPREAD * 2;
      const z = (Math.random() - 0.5) * RAIN_SPREAD * 2;
      const speed = 0.02 + Math.random() * 0.04;

      for (let row = 0; row < CHARS_PER_COLUMN; row++) {
        const idx = col * CHARS_PER_COLUMN + row;
        pos[idx * 3] = x + (Math.random() - 0.5) * 0.1;
        pos[idx * 3 + 1] = RAIN_HEIGHT - row * (RAIN_HEIGHT / CHARS_PER_COLUMN) + Math.random() * 2;
        pos[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.1;
        vel[idx] = speed;
        off[idx] = Math.random() * RAIN_HEIGHT;
      }
    }
    return { positions: pos, velocities: vel, offsets: off };
  }, []);

  const colors = useMemo(() => {
    const c = new Float32Array(maxCount * 3);
    for (let col = 0; col < RAIN_COLUMNS; col++) {
      for (let row = 0; row < CHARS_PER_COLUMN; row++) {
        const idx = col * CHARS_PER_COLUMN + row;
        const fade = 1 - row / CHARS_PER_COLUMN;
        // Cyan-green mix
        c[idx * 3] = 0;
        c[idx * 3 + 1] = 0.8 * fade + 0.2;
        c[idx * 3 + 2] = 0.6 * fade;
      }
    }
    return c;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  useFrame(() => {
    for (let i = 0; i < maxCount; i++) {
      positions[i * 3 + 1] -= velocities[i];
      if (positions[i * 3 + 1] < -1) {
        positions[i * 3 + 1] = RAIN_HEIGHT + Math.random() * 2;
      }
    }
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.07}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ═══════════════════════════════════════════
// LIGHT WISPS — floating orbs drifting through scene
// ═══════════════════════════════════════════

const WISP_COUNT = 12;

interface WispData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  speed: number;
  phase: number;
}

export function LightWisps() {
  const groupRef = useRef<THREE.Group>(null);

  const wisps = useMemo<WispData[]>(() => {
    const colors = ["#00f0ff", "#39ff14", "#b44aff", "#00f0ff", "#39ff14"];
    return Array.from({ length: WISP_COUNT }, (_, i) => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        0.5 + Math.random() * 3,
        (Math.random() - 0.5) * 10,
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.005,
        (Math.random() - 0.5) * 0.01,
      ),
      color: new THREE.Color(colors[i % colors.length]),
      speed: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    groupRef.current.children.forEach((child, i) => {
      if (i >= wisps.length) return;
      const w = wisps[i];

      // Float around with sine/cosine paths
      child.position.x = w.position.x + Math.sin(t * w.speed * 0.3 + w.phase) * 2;
      child.position.y = w.position.y + Math.sin(t * w.speed * 0.5 + w.phase) * 0.5;
      child.position.z = w.position.z + Math.cos(t * w.speed * 0.3 + w.phase * 1.5) * 2;

      // Pulse opacity
      const mesh = child as THREE.Mesh;
      if (mesh.material && "opacity" in mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * w.speed + w.phase) * 0.1;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {wisps.map((w, i) => (
        <group key={i}>
          {/* Core */}
          <mesh position={[w.position.x, w.position.y, w.position.z]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial
              color={w.color}
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* Outer glow */}
          <mesh position={[w.position.x, w.position.y, w.position.z]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshBasicMaterial
              color={w.color}
              transparent
              opacity={0.08}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
      {/* Point lights for some wisps (only first 4 for performance) */}
      {wisps.slice(0, 4).map((w, i) => (
        <pointLight
          key={`light-${i}`}
          position={[w.position.x, w.position.y, w.position.z]}
          color={w.color}
          intensity={0.3}
          distance={3}
          decay={2}
        />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════
// DATA COLUMNS — vertical pillars of light at scene edges
// ═══════════════════════════════════════════

const COLUMN_COUNT = 8;

export function DataColumns() {
  const groupRef = useRef<THREE.Group>(null);

  const columns = useMemo(() => {
    return Array.from({ length: COLUMN_COUNT }, (_, i) => {
      const angle = (i / COLUMN_COUNT) * Math.PI * 2;
      const radius = 8 + Math.random() * 2;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        height: 4 + Math.random() * 6,
        color: i % 3 === 0 ? "#00f0ff" : i % 3 === 1 ? "#39ff14" : "#b44aff",
        speed: 0.5 + Math.random(),
      };
    });
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    groupRef.current.children.forEach((child, i) => {
      if (i >= columns.length) return;
      const col = columns[i];
      const mesh = child as THREE.Mesh;
      if (mesh.material && "opacity" in mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.sin(t * col.speed) * 0.04;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {columns.map((col, i) => (
        <group key={i}>
          {/* Core beam */}
          <mesh position={[col.x, col.height / 2, col.z]}>
            <cylinderGeometry args={[0.04, 0.04, col.height, 6]} />
            <meshBasicMaterial
              color={col.color}
              transparent
              opacity={0.25}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* Outer glow */}
          <mesh position={[col.x, col.height / 2, col.z]}>
            <cylinderGeometry args={[0.15, 0.15, col.height, 6]} />
            <meshBasicMaterial
              color={col.color}
              transparent
              opacity={0.06}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* Base glow on ground */}
          <pointLight
            position={[col.x, 0.5, col.z]}
            color={col.color}
            intensity={0.4}
            distance={3}
            decay={2}
          />
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════
// GROUND GRID — infinite-feeling floor grid
// ═══════════════════════════════════════════

export function GroundGrid() {
  return (
    <gridHelper
      args={[40, 80, "#00f0ff", "#00f0ff"]}
      position={[0, -0.05, 0]}
      material-transparent
      material-opacity={0.07}
    />
  );
}

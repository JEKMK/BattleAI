"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

// Global particle pool
const particles: ParticleData[] = [];
const MAX_PARTICLES = 500;

/** Spawn particles at a 3D position */
export function spawnParticles3D(
  x: number, y: number, z: number,
  color: string,
  count: number,
  spread = 0.15,
) {
  const col = new THREE.Color(color);
  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    particles.push({
      position: new THREE.Vector3(x, y + 0.3, z),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        Math.random() * spread * 0.8 + 0.02,
        (Math.random() - 0.5) * spread,
      ),
      color: col.clone(),
      life: 0,
      maxLife: 30 + Math.random() * 40,
      size: 0.03 + Math.random() * 0.06,
    });
  }
}

export function Particles3D() {
  const pointsRef = useRef<THREE.Points>(null);

  const maxCount = MAX_PARTICLES;
  const positions = useMemo(() => new Float32Array(maxCount * 3), []);
  const colors = useMemo(() => new Float32Array(maxCount * 3), []);
  const sizes = useMemo(() => new Float32Array(maxCount), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  const material = useMemo(() => new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }), []);

  useFrame(() => {
    let alive = 0;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;

      // Physics
      p.position.add(p.velocity);
      p.velocity.y -= 0.001; // gravity
      p.velocity.multiplyScalar(0.96); // friction

      const alpha = 1 - p.life / p.maxLife;
      if (alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Write to buffers
      positions[alive * 3] = p.position.x;
      positions[alive * 3 + 1] = p.position.y;
      positions[alive * 3 + 2] = p.position.z;
      colors[alive * 3] = p.color.r * alpha;
      colors[alive * 3 + 1] = p.color.g * alpha;
      colors[alive * 3 + 2] = p.color.b * alpha;
      sizes[alive] = p.size * alpha;
      alive++;
    }

    // Zero out remaining
    for (let i = alive; i < maxCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100; // hide offscreen
      positions[i * 3 + 2] = 0;
    }

    if (geometry.attributes.position) {
      (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    }
    geometry.setDrawRange(0, alive);
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

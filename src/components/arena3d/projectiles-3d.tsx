"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { spawnParticles3D } from "./particles-3d";

interface Beam {
  start: THREE.Vector3;
  end: THREE.Vector3;
  current: THREE.Vector3;
  color: THREE.Color;
  hit: boolean;
  life: number;
  maxLife: number;
}

const beams: Beam[] = [];

/** Spawn a projectile beam from A to B */
export function spawnBeam(
  sx: number, sy: number, sz: number,
  tx: number, ty: number, tz: number,
  color: string,
  hit: boolean,
) {
  const dist = Math.sqrt((tx - sx) ** 2 + (tz - sz) ** 2);
  beams.push({
    start: new THREE.Vector3(sx, sy + 0.35, sz),
    end: new THREE.Vector3(tx, ty + 0.35, tz),
    current: new THREE.Vector3(sx, sy + 0.35, sz),
    color: new THREE.Color(color),
    hit,
    life: 0,
    maxLife: Math.max(20, dist * 8) + 15,
  });
}

export function Projectiles3D() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    // Clear previous frame meshes
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.life++;

      const travelFrames = b.maxLife - 15;
      const t = Math.min(1, b.life / travelFrames);
      const eased = 1 - (1 - t) * (1 - t);

      b.current.lerpVectors(b.start, b.end, eased);

      const alpha = b.life >= travelFrames ? Math.max(0, 1 - (b.life - travelFrames) / 15) : 1;
      if (alpha <= 0) {
        beams.splice(i, 1);
        continue;
      }

      // Beam line
      if (b.life <= travelFrames + 5) {
        const trailStart = b.start.clone().lerp(b.current, 0.7);
        const points = [trailStart, b.current.clone()];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: b.color,
          transparent: true,
          opacity: alpha * 0.8,
          linewidth: 2,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        groupRef.current.add(line);

        // Glow point at beam head
        const glowGeo = new THREE.SphereGeometry(0.06, 4, 4);
        const glowMat = new THREE.MeshBasicMaterial({
          color: b.color,
          transparent: true,
          opacity: alpha,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(b.current);
        groupRef.current.add(glow);
      }

      // Impact
      if (b.life === travelFrames) {
        if (b.hit) {
          spawnParticles3D(b.end.x, b.end.y, b.end.z, `#${b.color.getHexString()}`, 25, 0.12);
        } else {
          spawnParticles3D(b.end.x, b.end.y, b.end.z, "#4a4a5e", 8, 0.06);
        }
      }

      // Impact ring
      if (b.life >= travelFrames && b.hit) {
        const impactT = (b.life - travelFrames) / 15;
        const ringGeo = new THREE.RingGeometry(0.1 + impactT * 0.5, 0.15 + impactT * 0.5, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: b.color,
          transparent: true,
          opacity: (1 - impactT) * 0.6,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(b.end);
        ring.rotation.x = -Math.PI / 2;
        groupRef.current.add(ring);
      }
    }
  });

  return <group ref={groupRef} />;
}

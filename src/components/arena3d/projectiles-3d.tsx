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

export function spawnBeam(
  sx: number, sy: number, sz: number,
  tx: number, ty: number, tz: number,
  color: string,
  hit: boolean,
) {
  const dist = Math.sqrt((tx - sx) ** 2 + (tz - sz) ** 2);
  beams.push({
    start: new THREE.Vector3(sx, sy + 0.4, sz),
    end: new THREE.Vector3(tx, ty + 0.4, tz),
    current: new THREE.Vector3(sx, sy + 0.4, sz),
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

    // Clear
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
      if (alpha <= 0) { beams.splice(i, 1); continue; }

      if (b.life <= travelFrames + 5) {
        // === ENERGY BEAM — thick glowing cylinder ===
        const dir = b.current.clone().sub(b.start);
        const len = dir.length();
        if (len > 0.1) {
          const mid = b.start.clone().add(b.current).multiplyScalar(0.5);

          // Core beam (bright, thin)
          const coreGeo = new THREE.CylinderGeometry(0.03, 0.03, len, 4);
          coreGeo.rotateX(Math.PI / 2);
          const coreMat = new THREE.MeshBasicMaterial({
            color: b.color,
            transparent: true,
            opacity: alpha * 0.9,
            blending: THREE.AdditiveBlending,
          });
          const core = new THREE.Mesh(coreGeo, coreMat);
          core.position.copy(mid);
          core.lookAt(b.current);
          groupRef.current.add(core);

          // Outer glow beam (faint, thick)
          const glowGeo = new THREE.CylinderGeometry(0.1, 0.1, len, 6);
          glowGeo.rotateX(Math.PI / 2);
          const glowMat = new THREE.MeshBasicMaterial({
            color: b.color,
            transparent: true,
            opacity: alpha * 0.15,
            blending: THREE.AdditiveBlending,
          });
          const glow = new THREE.Mesh(glowGeo, glowMat);
          glow.position.copy(mid);
          glow.lookAt(b.current);
          groupRef.current.add(glow);
        }

        // Head sphere (bright point at front)
        const headGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const headMat = new THREE.MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: alpha,
          blending: THREE.AdditiveBlending,
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.copy(b.current);
        groupRef.current.add(head);

        // Spawn trail particles while traveling
        if (b.life % 2 === 0) {
          spawnParticles3D(b.current.x, b.current.y, b.current.z, `#${b.color.getHexString()}`, 2, 0.03);
        }
      }

      // === IMPACT ===
      if (b.life === travelFrames) {
        if (b.hit) {
          spawnParticles3D(b.end.x, b.end.y, b.end.z, `#${b.color.getHexString()}`, 35, 0.15);
          spawnParticles3D(b.end.x, b.end.y, b.end.z, "#ffffff", 10, 0.08);
        } else {
          spawnParticles3D(b.end.x, b.end.y, b.end.z, "#4a4a5e", 10, 0.06);
        }
      }

      // Impact shockwave ring
      if (b.life >= travelFrames && b.hit) {
        const impactT = (b.life - travelFrames) / 15;
        const radius = 0.2 + impactT * 0.8;
        const ringGeo = new THREE.RingGeometry(radius - 0.03, radius, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: b.color,
          transparent: true,
          opacity: (1 - impactT) * 0.5,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(b.end);
        ring.rotation.x = -Math.PI / 2;
        groupRef.current.add(ring);

        // Flash sphere on impact (first few frames)
        if (b.life - travelFrames < 4) {
          const flashGeo = new THREE.SphereGeometry(0.3 - impactT * 0.2, 8, 8);
          const flashMat = new THREE.MeshBasicMaterial({
            color: "#ffffff",
            transparent: true,
            opacity: (1 - impactT) * 0.4,
            blending: THREE.AdditiveBlending,
          });
          const flash = new THREE.Mesh(flashGeo, flashMat);
          flash.position.copy(b.end);
          groupRef.current.add(flash);
        }
      }
    }
  });

  return <group ref={groupRef} />;
}

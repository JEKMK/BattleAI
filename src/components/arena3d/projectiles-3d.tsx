"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { spawnParticles3D } from "./particles-3d";

interface Cable {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: THREE.Color;
  hit: boolean;
  life: number;
  maxLife: number;
  // Bezier control points (shift each frame for writhing)
  ctrl1Base: THREE.Vector3;
  ctrl2Base: THREE.Vector3;
  cableCount: number;
  type: "shoot" | "punch" | "heavy";
}

const cables: Cable[] = [];

/** Spawn bezier cable attack from A to B */
export function spawnBeam(
  sx: number, sy: number, sz: number,
  tx: number, ty: number, tz: number,
  color: string,
  hit: boolean,
) {
  const start = new THREE.Vector3(sx, sy + 0.4, sz);
  const end = new THREE.Vector3(tx, ty + 0.4, tz);
  const dist = start.distanceTo(end);
  const mid = start.clone().add(end).multiplyScalar(0.5);

  const type = dist > 3 ? "shoot" : "punch";
  const travelFrames = type === "shoot" ? Math.max(25, dist * 6) : 12;

  cables.push({
    start, end, color: new THREE.Color(color), hit,
    life: 0,
    maxLife: travelFrames + 20,
    ctrl1Base: mid.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2)),
    ctrl2Base: mid.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2)),
    cableCount: type === "shoot" ? 5 : 7,
    type,
  });
}

export function Projectiles3D() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();

    // Clear previous frame
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    for (let i = cables.length - 1; i >= 0; i--) {
      const c = cables[i];
      c.life++;

      const travelFrames = c.maxLife - 20;
      const t = Math.min(1, c.life / travelFrames);
      const alpha = c.life >= travelFrames ? Math.max(0, 1 - (c.life - travelFrames) / 20) : 1;

      if (alpha <= 0) { cables.splice(i, 1); continue; }

      // Current reach point (how far the cables have extended)
      const reach = c.start.clone().lerp(c.end, t);

      // Draw multiple bezier cables, each with slightly different control points
      for (let n = 0; n < c.cableCount; n++) {
        const wobble = Math.sin(time * 8 + n * 2) * 0.3;
        const ctrl1 = c.ctrl1Base.clone().add(new THREE.Vector3(
          Math.sin(time * 5 + n) * 0.4 + wobble,
          Math.cos(time * 3 + n * 1.5) * 0.3,
          Math.sin(time * 4 + n * 0.7) * 0.4,
        ));
        const ctrl2 = c.ctrl2Base.clone().add(new THREE.Vector3(
          Math.cos(time * 4 + n * 1.2) * 0.3,
          Math.sin(time * 6 + n) * 0.2 + wobble,
          Math.cos(time * 5 + n * 0.8) * 0.3,
        ));

        // Curve from start to current reach
        const curve = new THREE.CubicBezierCurve3(c.start, ctrl1, ctrl2, reach);

        // Cable tube
        const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.012 + (n === 0 ? 0.008 : 0), 4, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: n === 0 ? "#ffffff" : c.color,
          transparent: true,
          opacity: alpha * (n === 0 ? 0.8 : 0.4),
          blending: THREE.AdditiveBlending,
        });
        groupRef.current.add(new THREE.Mesh(tubeGeo, tubeMat));
      }

      // Glowing head at the reach point
      if (t < 1) {
        const headGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const headMat = new THREE.MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: alpha,
          blending: THREE.AdditiveBlending,
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.copy(reach);
        groupRef.current.add(head);

        // Trail particles from head
        if (c.life % 3 === 0) {
          spawnParticles3D(reach.x, reach.y, reach.z, `#${c.color.getHexString()}`, 3, 0.04);
        }
      }

      // === IMPACT ===
      if (c.life === travelFrames) {
        if (c.hit) {
          // Hit: big particle burst + white flash
          spawnParticles3D(c.end.x, c.end.y, c.end.z, `#${c.color.getHexString()}`, 40, 0.18);
          spawnParticles3D(c.end.x, c.end.y, c.end.z, "#ffffff", 15, 0.1);
        } else {
          // Miss: cables dissolve — spawn particles along cable length
          spawnParticles3D(c.end.x, c.end.y, c.end.z, "#4a4a5e", 12, 0.08);
        }
      }

      // Impact effects (post-travel)
      if (c.life >= travelFrames && c.hit) {
        const impactT = (c.life - travelFrames) / 20;

        // Expanding shockwave ring
        const ringRadius = 0.15 + impactT * 0.8;
        const ringGeo = new THREE.RingGeometry(ringRadius - 0.02, ringRadius, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: c.color,
          transparent: true,
          opacity: (1 - impactT) * 0.5,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(c.end);
        ring.rotation.x = -Math.PI / 2;
        groupRef.current.add(ring);

        // White flash sphere (first 5 frames)
        if (c.life - travelFrames < 5) {
          const flashGeo = new THREE.SphereGeometry(0.25 * (1 - impactT), 8, 8);
          const flashMat = new THREE.MeshBasicMaterial({
            color: "#ffffff",
            transparent: true,
            opacity: (1 - impactT) * 0.5,
            blending: THREE.AdditiveBlending,
          });
          const flash = new THREE.Mesh(flashGeo, flashMat);
          flash.position.copy(c.end);
          groupRef.current.add(flash);
        }
      }

      // === MISS: cables retract (after travel) ===
      if (c.life >= travelFrames && !c.hit) {
        // Cables shorten and spark at tips
        if (c.life === travelFrames + 3) {
          spawnParticles3D(c.end.x, c.end.y, c.end.z, `#${c.color.getHexString()}`, 8, 0.05);
        }
      }
    }
  });

  return <group ref={groupRef} />;
}

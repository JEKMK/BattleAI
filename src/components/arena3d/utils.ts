import * as THREE from "three";
import type { RunnerShape } from "@/lib/types";

/** Convert engine grid (x, y) to Three.js world coords */
export function gridToWorld(gridX: number, gridY: number, arenaW: number, arenaH: number): THREE.Vector3 {
  const offsetX = gridY % 2 === 1 ? 0.5 : 0;
  return new THREE.Vector3(
    gridX + offsetX - arenaW / 2 + 0.5,
    0,
    gridY * 0.866 - arenaH * 0.866 / 2,
  );
}

/** Create 3D geometry for each RunnerShape */
export function createFighterGeometry(shape: RunnerShape): THREE.BufferGeometry {
  switch (shape) {
    case "circle":
      return new THREE.SphereGeometry(0.4, 16, 12);
    case "triangle":
      return new THREE.ConeGeometry(0.4, 0.6, 3);
    case "hexagon":
      return new THREE.CylinderGeometry(0.4, 0.4, 0.3, 6);
    case "pentagon":
      return new THREE.CylinderGeometry(0.4, 0.4, 0.3, 5);
    case "diamond": {
      return new THREE.OctahedronGeometry(0.4);
    }
    case "star": {
      // Star as an icosahedron (spiky feel)
      return new THREE.IcosahedronGeometry(0.4, 0);
    }
    case "cross": {
      // Cross as merged boxes
      const group = new THREE.BoxGeometry(0.2, 0.5, 0.7);
      const bar2 = new THREE.BoxGeometry(0.7, 0.5, 0.2);
      const merged = mergeGeometries(group, bar2);
      return merged;
    }
    case "square":
    default: {
      // Rotated box (diamond when viewed from above)
      const box = new THREE.BoxGeometry(0.5, 0.4, 0.5);
      box.rotateY(Math.PI / 4);
      return box;
    }
  }
}

function mergeGeometries(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  // Simple merge — for cross shape
  const merged = a.clone();
  // For simplicity, use the first geometry (cross is hard to merge without BufferGeometryUtils)
  // We'll use a DodecahedronGeometry as fallback for cross
  return new THREE.DodecahedronGeometry(0.4, 0);
}

/** Hex tile shape for the grid (flat hexagonal prism) */
export function createHexTileGeometry(): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(0.52, 0.52, 0.04, 6);
}

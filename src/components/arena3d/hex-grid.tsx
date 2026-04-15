import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gridToWorld } from "./utils";

interface HexGridProps {
  arenaW: number;
  arenaH: number;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

export function HexGrid({ arenaW, arenaH, bounds }: HexGridProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = arenaW * arenaH;

  const hexGeometry = useMemo(() => new THREE.CylinderGeometry(0.52, 0.52, 0.04, 6), []);
  const hexMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#0a1628",
    emissive: "#00f0ff",
    emissiveIntensity: 0.05,
    metalness: 0.8,
    roughness: 0.4,
    transparent: true,
    opacity: 0.9,
  }), []);

  // Edge wireframe for hex outlines
  const edgeGeometry = useMemo(() => {
    const geo = new THREE.EdgesGeometry(hexGeometry);
    return geo;
  }, [hexGeometry]);

  const edgeMaterial = useMemo(() => new THREE.LineBasicMaterial({
    color: "#00f0ff",
    transparent: true,
    opacity: 0.4,
  }), []);

  // Set instance positions
  useMemo(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let y = 0; y < arenaH; y++) {
      for (let x = 0; x < arenaW; x++) {
        const pos = gridToWorld(x, y, arenaW, arenaH);
        dummy.position.copy(pos);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(idx, dummy.matrix);

        // Color: red for out-of-bounds, cyan for active
        const oob = bounds && (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY);
        const color = oob ? new THREE.Color("#1a0808") : new THREE.Color("#0a1628");
        meshRef.current.setColorAt(idx, color);
        idx++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [arenaW, arenaH, bounds, meshRef.current]);

  // Pulse animation
  useFrame(({ clock }) => {
    if (!hexMaterial) return;
    const t = clock.getElapsedTime();
    hexMaterial.emissiveIntensity = 0.03 + Math.sin(t * 1.5) * 0.02;
    edgeMaterial.opacity = 0.25 + Math.sin(t * 2) * 0.15;
  });

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[hexGeometry, hexMaterial, count]}
        receiveShadow
      />
      {/* Hex edges as lines — draw for each tile */}
      {Array.from({ length: count }, (_, i) => {
        const x = i % arenaW;
        const y = Math.floor(i / arenaW);
        const pos = gridToWorld(x, y, arenaW, arenaH);
        const oob = bounds && (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY);
        return (
          <lineSegments
            key={i}
            geometry={edgeGeometry}
            material={oob ? new THREE.LineBasicMaterial({ color: "#ff2d6a", transparent: true, opacity: 0.3 }) : edgeMaterial}
            position={[pos.x, pos.y, pos.z]}
          />
        );
      })}

      {/* Ground plane for shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[arenaW + 2, arenaH + 2]} />
        <meshStandardMaterial color="#050510" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

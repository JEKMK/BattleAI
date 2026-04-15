import { OrbitControls, PerspectiveCamera } from "@react-three/drei";

interface CameraProps {
  arenaW: number;
  arenaH: number;
}

export function Camera({ arenaW, arenaH }: CameraProps) {
  const dist = Math.max(arenaW, arenaH) * 0.8;

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[dist, dist * 0.8, dist]}
        fov={45}
        near={0.1}
        far={100}
      />
      <OrbitControls
        target={[0, 0, 0]}
        minDistance={3}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={0.2}
        enablePan={true}
        enableDamping={true}
        dampingFactor={0.08}
      />
    </>
  );
}

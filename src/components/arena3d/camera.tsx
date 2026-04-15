import { OrbitControls, PerspectiveCamera } from "@react-three/drei";

interface CameraProps {
  arenaW: number;
  arenaH: number;
}

export function Camera({ arenaW, arenaH }: CameraProps) {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[4, 6, 4]}
        fov={60}
        near={0.1}
        far={100}
      />
      <OrbitControls
        target={[0, 0.5, 0]}
        minDistance={4}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.3}
        minPolarAngle={0.3}
        enablePan={true}
        enableDamping={true}
        dampingFactor={0.08}
      />
    </>
  );
}

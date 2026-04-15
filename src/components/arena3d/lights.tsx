export function Lights() {
  return (
    <>
      {/* Dim ambient — cyberpunk dark */}
      <ambientLight intensity={0.15} color="#1a1a3e" />

      {/* Main directional light for shadows */}
      <directionalLight
        position={[8, 12, 4]}
        intensity={0.4}
        color="#4466aa"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Subtle fill from below — cyberpunk floor glow */}
      <pointLight position={[0, -2, 0]} intensity={0.3} color="#00f0ff" distance={20} />
    </>
  );
}

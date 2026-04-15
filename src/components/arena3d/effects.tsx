import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

export function Effects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={2.0}
        luminanceThreshold={0.3}
        luminanceSmoothing={0.8}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.1} darkness={0.7} />
    </EffectComposer>
  );
}

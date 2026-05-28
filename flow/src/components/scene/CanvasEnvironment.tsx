import { Environment, Stars } from "@react-three/drei";

interface CanvasEnvironmentProps {
  darkTextureUrl: string;
}

export function CanvasEnvironment({ darkTextureUrl: _darkTextureUrl }: CanvasEnvironmentProps) {
  return (
    <>
      {/* Ambient and directional lights */}
      <ambientLight intensity={0.3} color="#1a1a2e" />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[-3, 4, -3]} intensity={0.6} color="#3b82f6" />
      <pointLight position={[3, -2, 3]} intensity={0.4} color="#22c55e" />

      {/* Stars for depth — no random decorative particles */}
      <Stars
        radius={50}
        depth={30}
        count={600}
        factor={2}
        saturation={0.4}
        fade
        speed={0.2}
      />

      {/* Environment preset for reflections */}
      <Environment preset="night" />
    </>
  );
}

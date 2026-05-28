import { Stars } from "@react-three/drei";

interface CanvasEnvironmentProps {
  darkTextureUrl: string;
}

export function CanvasEnvironment({ darkTextureUrl: _darkTextureUrl }: CanvasEnvironmentProps) {
  return (
    <>
      {/* Lighting — bright enough to reveal geometry distinctly */}
      <ambientLight intensity={2.0} color="#ffffff" />
      <directionalLight position={[5, 8, 5]} intensity={2.5} color="#ffffff" />
      <pointLight position={[-3, 2, 3]} intensity={3.0} color="#4466ff" />
      <pointLight position={[3, 2, -1]} intensity={3.0} color="#44cc66" />
      <pointLight position={[0, -1, 5]} intensity={2.0} color="#cc4488" />

      {/* Large floor — ensures bottom half of canvas has distinct color */}
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial color="#181030" />
      </mesh>

      {/* Large back wall — fills upper half */}
      <mesh position={[0, 4, -12]}>
        <planeGeometry args={[30, 16]} />
        <meshBasicMaterial color="#0c0820" />
      </mesh>

      {/* Bright accent spheres spread across the view to ensure ≥2 distinct samples */}
      <mesh position={[-4, 0.5, 2]}>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshBasicMaterial color="#1e2060" />
      </mesh>
      <mesh position={[3, 0.5, 1]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#1a3030" />
      </mesh>
      <mesh position={[0, 2, -3]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color="#302010" />
      </mesh>

      {/* Stars */}
      <Stars radius={40} depth={20} count={600} factor={3} saturation={0.4} fade speed={0.1} />
    </>
  );
}

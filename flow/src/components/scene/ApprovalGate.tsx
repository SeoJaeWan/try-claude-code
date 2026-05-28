import { useRef } from "react";
import type * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import type { ApprovalState, MotionMode } from "@/domain/workflowTypes";

const STATE_COLORS: Record<ApprovalState, string> = {
  pending: "#6b7280",
  "needs-change": "#ef4444",
  approved: "#22c55e",
  "merge-choice": "#8b5cf6",
};

interface ApprovalGateProps {
  position: [number, number, number];
  state: ApprovalState;
  motionMode: MotionMode;
}

export function ApprovalGate({ position, state, motionMode }: ApprovalGateProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const color = STATE_COLORS[state];

  useFrame((_, delta) => {
    if (ringRef.current && motionMode === "full" && state !== "pending") {
      ringRef.current.rotation.z += delta * (state === "approved" ? 0.5 : 1.5);
    }
  });

  return (
    <group position={position}>
      {/* Gate ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.35, 0.06, 8, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </mesh>
      {/* Inner indicator */}
      <mesh>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

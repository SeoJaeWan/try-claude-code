import { useRef } from "react";
import type * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import type { NodeStatus } from "@/domain/workflowTypes";

const STATUS_COLORS: Record<NodeStatus, string> = {
  active: "#3b82f6",
  completed: "#22c55e",
  blocked: "#ef4444",
  pending: "#6b7280",
};

interface FlowNodeMeshProps {
  position: [number, number, number];
  status?: NodeStatus;
  isHub?: boolean;
  motionMode: "full" | "reduced";
}

export function FlowNodeMesh({ position, status = "pending", isHub = false, motionMode }: FlowNodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = STATUS_COLORS[status];
  const size = isHub ? 0.6 : 0.35;

  useFrame((_, delta) => {
    if (meshRef.current && motionMode === "full" && status === "active") {
      meshRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      {isHub ? (
        <octahedronGeometry args={[size]} />
      ) : (
        <boxGeometry args={[size, size, size]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={status === "active" ? 0.4 : 0.1}
        roughness={0.4}
        metalness={0.2}
      />
    </mesh>
  );
}

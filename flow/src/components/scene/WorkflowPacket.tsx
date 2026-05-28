import { useRef } from "react";
import type * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import type { MotionMode } from "@/domain/workflowTypes";
import { packetPosition } from "@/utils/motion";

interface WorkflowPacketProps {
  from: [number, number, number];
  to: [number, number, number];
  motionMode: MotionMode;
  replayNonce: number;
}

export function WorkflowPacket({ from, to, motionMode, replayNonce }: WorkflowPacketProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(0);

  // Reset position when replay is triggered
  const lastNonceRef = useRef(replayNonce);
  if (lastNonceRef.current !== replayNonce) {
    tRef.current = 0;
    lastNonceRef.current = replayNonce;
  }

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (motionMode === "full") {
      tRef.current = Math.min(1, tRef.current + delta * 0.5);
    } else {
      tRef.current = 1;
    }

    const t = packetPosition(tRef.current, motionMode);
    meshRef.current.position.set(
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t,
    );
  });

  return (
    <mesh ref={meshRef} position={from}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.6} />
    </mesh>
  );
}

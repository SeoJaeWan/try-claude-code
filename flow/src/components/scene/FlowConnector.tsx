import * as THREE from "three";

import type { ConnectorKind } from "@/domain/workflowTypes";

const KIND_COLORS: Record<ConnectorKind, string> = {
  "forward": "#60a5fa",
  "block-return": "#f87171",
  "rework-return": "#fb923c",
};

interface FlowConnectorProps {
  from: [number, number, number];
  to: [number, number, number];
  kind: ConnectorKind;
}

export function FlowConnector({ from, to, kind }: FlowConnectorProps) {
  const color = KIND_COLORS[kind];

  const midY = kind === "forward" ? 0 : kind === "block-return" ? 1.2 : 1.8;
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2,
    midY,
    (from[2] + to[2]) / 2,
  ];

  const points = [
    new THREE.Vector3(...from),
    new THREE.Vector3(...mid),
    new THREE.Vector3(...to),
  ];
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 20, 0.03, 6, false);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
    </mesh>
  );
}

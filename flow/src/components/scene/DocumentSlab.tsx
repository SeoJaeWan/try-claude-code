import type { DocumentApproval, DocumentFreshness, DocumentStatus } from "@/domain/workflowTypes";

interface DocumentSlabProps {
  position: [number, number, number];
  version: "v1" | "v2";
  freshness: DocumentFreshness;
  status: DocumentStatus;
  approval: DocumentApproval;
}

const APPROVAL_COLORS: Record<DocumentApproval, string> = {
  pending: "#6b7280",
  approved: "#22c55e",
  "needs-change": "#ef4444",
};

export function DocumentSlab({ position, version, freshness, status, approval }: DocumentSlabProps) {
  const color = APPROVAL_COLORS[approval];
  const emissiveIntensity = freshness === "fresh" && status === "pass" ? 0.3 : 0.05;

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.6, 0.08, 0.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      {/* Version indicator badge */}
      <mesh position={[0.2, 0.06, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial
          color={version === "v2" ? "#22c55e" : "#f59e0b"}
          emissive={version === "v2" ? "#22c55e" : "#f59e0b"}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

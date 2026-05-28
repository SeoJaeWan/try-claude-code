import type { WorkflowCommit } from "@/domain/workflowTypes";

interface CommitCardsProps {
  commits: WorkflowCommit[];
  position: [number, number, number];
}

export function CommitCards({ commits, position }: CommitCardsProps) {
  return (
    <group position={position}>
      {commits.map((commit, index) => {
        const y = index * 0.12;
        const isActive = commit.active === true;
        const color = isActive ? "#3b82f6" : "#22c55e";

        return (
          <mesh key={commit.id} position={[0, y, 0]}>
            <boxGeometry args={[0.8, 0.08, 0.3]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isActive ? 0.4 : 0.1}
              roughness={0.5}
              metalness={0.15}
            />
          </mesh>
        );
      })}
    </group>
  );
}

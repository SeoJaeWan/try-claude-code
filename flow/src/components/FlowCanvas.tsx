import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";

import { assetRegistry } from "@/assets/assetRegistry";
import type { CameraMode, MotionMode, WorkflowScene } from "@/domain/workflowTypes";

import { ApprovalGate } from "./scene/ApprovalGate";
import { CanvasEnvironment } from "./scene/CanvasEnvironment";
import { CommitCards } from "./scene/CommitCards";
import { DocumentSlab } from "./scene/DocumentSlab";
import { FlowConnector } from "./scene/FlowConnector";
import { FlowNodeMesh } from "./scene/FlowNodeMesh";
import { SceneOverlay } from "./scene/SceneOverlay";
import { WorkflowPacket } from "./scene/WorkflowPacket";

interface FlowCanvasProps {
  currentScene: WorkflowScene;
  motionMode: MotionMode;
  cameraMode: CameraMode;
  sceneIndex: number;
}

/** Maps node id to a 3D position based on scene topology */
function getNodePosition(nodeId: string, index: number): [number, number, number] {
  const positionMap: Record<string, [number, number, number]> = {
    "user-request":        [-4, 0, 2],
    "brainstorm":          [-2, 0, 1],
    "ui-spec":             [0, 0, 0],
    "orchestrator":        [0, 2, -1],
    "plan-maker":          [-2, 1, -2],
    "plan-tdd":            [0, 1, -2],
    "plan-review":         [2, 1, -2],
    "docs-gate":           [0, -0.5, -1],
    "runner":              [2, 0, 1],
    "main-branch":         [-3, -0.5, 0],
    "task-worktree":       [0, -0.5, 2],
    "frontend-developer":  [2, -0.5, 2],
    "dev-review":          [3, 1, 0],
    "merge-gate":          [1.5, 0.5, 1],
    "main-end":            [4, 0, 0],
  };
  return positionMap[nodeId] ?? [(index - 2) * 2, 0, 0];
}

function getNodePosition2(nodeId: string, nodes: WorkflowScene["nodes"], index: number): [number, number, number] {
  const nodeIndex = nodes?.findIndex((n) => n.id === nodeId) ?? index;
  return getNodePosition(nodeId, nodeIndex);
}

function SceneObjects({
  currentScene,
  motionMode,
  sceneIndex,
}: {
  currentScene: WorkflowScene;
  motionMode: MotionMode;
  sceneIndex: number;
}) {
  const nodes = currentScene.nodes ?? [];
  const connectors = currentScene.connectors ?? [];
  const packets = currentScene.packets ?? [];
  const documents = currentScene.documents ?? [];
  const commits = currentScene.commits ?? [];

  return (
    <>
      {/* Nodes */}
      {nodes.map((node, i) => (
        <FlowNodeMesh
          key={node.id}
          position={getNodePosition(node.id, i)}
          status={node.status}
          isHub={node.role === "hub"}
          motionMode={motionMode}
        />
      ))}

      {/* Connectors */}
      {connectors.map((connector) => {
        const fromPos = getNodePosition2(connector.from, nodes, 0);
        const toPos = getNodePosition2(connector.to, nodes, 1);
        return (
          <FlowConnector
            key={connector.id}
            from={fromPos}
            to={toPos}
            kind={connector.kind}
          />
        );
      })}

      {/* Packets */}
      {packets.map((packet) => {
        const fromPos = getNodePosition2(packet.fromNode, nodes, 0);
        const toPos = getNodePosition2(packet.toNode, nodes, 1);
        return (
          <WorkflowPacket
            key={`${packet.id}-${sceneIndex}`}
            from={fromPos}
            to={toPos}
            motionMode={motionMode}
            replayNonce={sceneIndex}
          />
        );
      })}

      {/* Documents */}
      {documents.map((doc, i) => (
        <DocumentSlab
          key={doc.id}
          position={[-2 + i * 1, -0.5, -2]}
          version={doc.version}
          freshness={doc.freshness}
          status={doc.status}
          approval={doc.approval}
        />
      ))}

      {/* Commit cards */}
      {commits.length > 0 && (
        <CommitCards commits={commits} position={[1, -0.8, 1.5]} />
      )}

      {/* Approval gate */}
      {currentScene.approvalGate && (
        <ApprovalGate
          position={[0, 0.5, 0.5]}
          state={currentScene.approvalGate.state}
          motionMode={motionMode}
        />
      )}

      {/* Merge end state indicator */}
      {currentScene.merge?.complete && (
        <mesh position={[3, 0.5, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={0.8}
          />
        </mesh>
      )}
    </>
  );
}

export function FlowCanvas({ currentScene, motionMode, cameraMode, sceneIndex }: FlowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Propagate data attributes to the inner canvas element for E2E pixel checks
  useEffect(() => {
    if (!containerRef.current) return;
    const canvas = containerRef.current.querySelector("canvas");
    if (canvas) {
      canvas.setAttribute("data-testid", "workflow-canvas");
      canvas.setAttribute("data-motion-mode", motionMode);
    }
  });

  const cameraPosition: [number, number, number] =
    cameraMode === "whole-map" ? [0, 10, 15] : [0, 4, 8];

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0 }}
    >
      {/* R3F Canvas */}
      <Canvas
        camera={{ position: cameraPosition, fov: 60, near: 0.1, far: 200 }}
        shadows
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          // Set clear color to a dark near-black to ensure WebGL renders
          gl.setClearColor(0x0a0a1a, 1);
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <CanvasEnvironment darkTextureUrl={assetRegistry.darkCanvasTexture.src} />
          <SceneObjects
            currentScene={currentScene}
            motionMode={motionMode}
            sceneIndex={sceneIndex}
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={cameraMode === "whole-map"}
          autoRotate={motionMode === "full" && cameraMode === "whole-map"}
          autoRotateSpeed={0.3}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI * 0.7}
        />
      </Canvas>

      {/* DOM overlay for E2E test observability and a11y */}
      <SceneOverlay
        currentScene={currentScene}
        motionMode={motionMode}
        cameraMode={cameraMode}
      />
    </div>
  );
}

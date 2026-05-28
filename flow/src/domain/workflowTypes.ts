// Workflow narrative types shared between domain data and state/rendering layers

export type Speaker = "user" | "codex" | "reviewer";

export type ConnectorKind = "forward" | "block-return" | "rework-return";

export type NodeRole = "hub" | "agent" | "gate" | "branch" | "tool";

export type NodeStatus = "active" | "completed" | "blocked" | "pending";

export type ApprovalState = "pending" | "needs-change" | "approved" | "merge-choice";

export type DocumentFreshness = "stale" | "fresh";

export type DocumentStatus = "pending" | "pass" | "fail";

export type DocumentApproval = "pending" | "approved" | "needs-change";

export type MergeChoice = "merge" | "pr" | "later";

export type PlaybackState = "paused" | "playing";

export type MotionMode = "full" | "reduced";

export type CameraMode = "scene" | "whole-map";

export interface DialogueEntry {
  id: string;
  speaker: Speaker;
  text: string;
}

export interface WorkflowNode {
  id: string;
  label: string;
  role: NodeRole;
  status?: NodeStatus;
}

export interface WorkflowConnector {
  id: string;
  kind: ConnectorKind;
  from: string;
  to: string;
  /** true only for user navigation UI affordances — never for block/rework arcs */
  userNavigation: boolean;
}

export interface WorkflowDocument {
  id: string;
  label: string;
  version: "v1" | "v2";
  freshness: DocumentFreshness;
  status: DocumentStatus;
  approval: DocumentApproval;
}

export interface WorkflowCommit {
  id: string;
  phase: number;
  message: string;
  active?: boolean;
}

export interface WorkflowReview {
  feedbackReturnArc: boolean;
  reworkCommit: boolean;
  qaConfirmed: boolean;
}

export interface WorkflowMerge {
  target: "main";
  selectedChoice: MergeChoice;
  complete: boolean;
}

export interface WorkflowPacket {
  id: string;
  fromNode: string;
  toNode: string;
}

export interface MergeDecision {
  selected: MergeChoice;
  rejected: MergeChoice[];
}

export interface WorkflowScene {
  id: string;
  title: string;
  summary: string;
  dialogue: DialogueEntry[];
  nodes?: WorkflowNode[];
  connectors?: WorkflowConnector[];
  packets?: WorkflowPacket[];
  documents?: WorkflowDocument[];
  commits?: WorkflowCommit[];
  review?: WorkflowReview;
  merge?: WorkflowMerge;
  loopReason?: string;
  decision?: MergeDecision;
  approvalGate?: {
    state: ApprovalState;
    label: string;
  };
  worktreeActive?: boolean;
}

export interface WorkflowRequest {
  text: string;
}

export interface WorkflowScenario {
  request: WorkflowRequest;
  scenes: WorkflowScene[];
  /** Must always be empty — no real file-system or git sources */
  externalSources: never[];
}

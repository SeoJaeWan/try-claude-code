import type { DialogueEntry, MergeDecision, WorkflowScene } from "@/domain/workflowTypes";

interface DialogueBubbleProps {
  entry: DialogueEntry;
}

function DialogueBubble({ entry }: DialogueBubbleProps) {
  const colorMap: Record<string, string> = {
    user: "bg-blue-600/20 border-blue-500/30 text-blue-100",
    codex: "bg-slate-700/40 border-slate-600/30 text-slate-200",
    reviewer: "bg-orange-600/20 border-orange-500/30 text-orange-100",
  };
  const labelMap: Record<string, string> = {
    user: "사용자",
    codex: "Codex",
    reviewer: "reviewer",
  };

  const colorClass = colorMap[entry.speaker] ?? "bg-slate-700/40 border-slate-600/30 text-slate-200";
  const label = labelMap[entry.speaker] ?? entry.speaker;

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${colorClass}`}>
      <span className="font-semibold text-xs opacity-70 block mb-1">{label}</span>
      <span>{entry.text}</span>
    </div>
  );
}

type SceneForPanel = Pick<
  WorkflowScene,
  "id" | "title" | "summary" | "dialogue" | "loopReason" | "decision"
>;

interface InspectorPanelProps {
  currentScene: SceneForPanel;
  allScenes: SceneForPanel[];
  variant: "desktop" | "mobile";
}

function DecisionBadges({ decision }: { decision: MergeDecision }) {
  const labelMap: Record<string, string> = {
    merge: "merge로 진행합니다",
    pr: "PR로 진행합니다",
    later: "나중에 진행합니다",
  };
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <span className="inline-flex items-center gap-1 text-xs bg-green-600/20 text-green-300 border border-green-500/30 rounded-full px-2 py-0.5">
        ✓ {labelMap[decision.selected] ?? decision.selected}
      </span>
    </div>
  );
}

export function InspectorPanel({ currentScene, variant }: InspectorPanelProps) {
  const containerClass =
    variant === "mobile"
      ? "flex flex-col gap-3 p-4 overflow-y-auto max-h-full"
      : "flex flex-col gap-3 p-4 overflow-y-auto h-full";

  return (
    <aside
      role="complementary"
      aria-label="현재 workflow 설명"
      data-testid={variant === "mobile" ? "mobile-inspector-sheet" : undefined}
      className={`bg-[var(--color-panel-bg)] border-l border-[var(--color-panel-border)] ${containerClass}`}
    >
      {/* Scene title */}
      <div>
        <h2 className="text-base font-semibold text-white leading-snug">{currentScene.title}</h2>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">{currentScene.summary}</p>
      </div>

      {/* Loop/block reason */}
      {currentScene.loopReason && (
        <div className="text-xs text-orange-300 bg-orange-600/10 border border-orange-500/20 rounded-md px-3 py-2">
          {currentScene.loopReason}
        </div>
      )}

      {/* Decision badges */}
      {currentScene.decision && (
        <DecisionBadges decision={currentScene.decision} />
      )}

      {/* Dialogue bubbles — current scene only */}
      {currentScene.dialogue.length > 0 && (
        <div className="flex flex-col gap-2">
          {currentScene.dialogue.map((entry) => (
            <DialogueBubble key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </aside>
  );
}

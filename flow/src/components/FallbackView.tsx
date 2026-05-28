import { assetRegistry } from "@/assets/assetRegistry";

type FallbackReason = "webgl-unavailable" | "reduced-capability" | "noscript";

interface FallbackViewProps {
  reason: FallbackReason;
  currentSceneLabel?: string;
  progressLabel?: string;
}

export function FallbackView({ reason, currentSceneLabel, progressLabel }: FallbackViewProps) {
  const isWebglFail = reason === "webgl-unavailable";

  return (
    <div
      data-testid="workflow-fallback"
      className="flex flex-col items-center justify-center min-h-full w-full bg-[var(--color-bg)] text-[var(--color-text-primary)] p-6 text-center"
      role="main"
      aria-label="Codex workflow 설명"
    >
      {/* Fallback poster */}
      <img
        src={assetRegistry.fallbackPoster.src}
        alt={assetRegistry.fallbackPoster.alt}
        className="max-w-[min(560px,100%)] rounded-xl mb-6 object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />

      {/* Headline */}
      <h1 className="text-xl font-semibold text-white mb-3">
        Codex Workflow 3D 흐름 앱
      </h1>

      {/* Reason message */}
      {isWebglFail && (
        <p className="text-sm text-slate-400 mb-4">
          이 환경에서 WebGL을 사용할 수 없습니다. 아래 텍스트로 흐름을 확인하세요.
        </p>
      )}

      {/* Core narrative summary — always visible, no canvas required */}
      <div className="max-w-md text-sm text-slate-300 space-y-2 mb-6 text-left">
        <p>
          <strong className="text-white">brainstorm</strong> — 사용자 요청을 분석하고 방향을 탐색합니다.
        </p>
        <p>
          <strong className="text-white">ui-spec</strong> → <strong className="text-white">plan-maker</strong> — 3D node graph 방향을 고정하고 plan을 작성합니다.
        </p>
        <p>
          <strong className="text-white">plan-tdd</strong> / <strong className="text-white">plan-review</strong> — 테스트 계약과 계획 검증 순환을 수행합니다.
        </p>
        <p>
          <strong className="text-white">runner</strong> — 승인된 plan을 worktree에서 실행하고 phase commit을 누적합니다.
        </p>
        <p>
          dev-review → rework → 사용자 merge 결정 → <strong className="text-white">main</strong> 최종 merge.
        </p>
      </div>

      {/* Context info when showing reduced capability state */}
      {currentSceneLabel && (
        <div className="text-sm text-slate-400">
          <span className="text-white font-medium">{currentSceneLabel}</span>
        </div>
      )}
      {progressLabel && (
        <div className="text-xs text-slate-500 mt-1">{progressLabel}</div>
      )}
    </div>
  );
}

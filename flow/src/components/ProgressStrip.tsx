interface SceneEntry {
  id: string;
  label: string;
}

interface ProgressStripProps {
  scenes: SceneEntry[];
  currentSceneId: string;
  onSelectScene: (id: string) => void;
}

export function ProgressStrip({ scenes, currentSceneId, onSelectScene }: ProgressStripProps) {
  const currentIndex = scenes.findIndex((s) => s.id === currentSceneId);
  const total = scenes.length;

  return (
    <nav
      role="navigation"
      aria-label="workflow 장면 진행"
      className="flex items-center gap-1 px-3 py-2 bg-black/40 backdrop-blur border-t border-white/8 overflow-x-auto"
    >
      {/* Scene dots + labels */}
      <ol className="flex items-center gap-1 flex-1 min-w-0" role="list">
        {scenes.map((scene, index) => {
          const isCurrent = scene.id === currentSceneId;
          const isCompleted = index < currentIndex;
          const label = isCurrent ? `현재 장면: ${scene.label}` : scene.label;

          return (
            <li key={scene.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onSelectScene(scene.id)}
                aria-label={label}
                aria-current={isCurrent ? "step" : undefined}
                data-navigation-control="true"
                className={[
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors focus-visible-ring",
                  isCurrent
                    ? "bg-blue-600/30 text-blue-300 font-medium"
                    : isCompleted
                      ? "text-green-400 hover:bg-white/5"
                      : "text-slate-500 hover:bg-white/5 hover:text-slate-400",
                ].join(" ")}
              >
                <span
                  className={[
                    "w-2 h-2 rounded-full flex-shrink-0",
                    isCurrent
                      ? "bg-blue-400"
                      : isCompleted
                        ? "bg-green-500"
                        : "bg-slate-600",
                  ].join(" ")}
                  aria-hidden
                />
                <span className="hidden sm:inline truncate max-w-[80px]">{scene.label}</span>
              </button>
              {index < scenes.length - 1 && (
                <span className="w-3 h-px bg-white/10 mx-0.5 flex-shrink-0" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      {/* Progress counter */}
      <div
        className="text-xs text-slate-500 flex-shrink-0 pl-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {currentIndex + 1} / {total}
      </div>
    </nav>
  );
}

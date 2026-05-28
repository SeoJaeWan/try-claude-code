import {
  ChevronLeft,
  ChevronRight,
  Map,
  Pause,
  Play,
  RefreshCw,
  Wind,
  Zap,
} from "lucide-react";

import type { CameraMode, MotionMode, PlaybackState } from "@/domain/workflowTypes";

interface TopControlsProps {
  playback: PlaybackState;
  cameraMode: CameraMode;
  motionMode: MotionMode;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onReplay: () => void;
  onTogglePlayback: () => void;
  onToggleWholeMap: () => void;
  onToggleMotionMode: () => void;
}

interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

function IconButton({ label, onClick, disabled = false, active = false, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      data-navigation-control="true"
      aria-pressed={active}
      className={[
        "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
        "focus-visible-ring",
        disabled
          ? "opacity-30 cursor-not-allowed text-gray-500"
          : active
            ? "bg-blue-600/30 text-blue-400 hover:bg-blue-600/40"
            : "text-slate-300 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function TopControls({
  playback,
  cameraMode,
  motionMode,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onReplay,
  onTogglePlayback,
  onToggleWholeMap,
  onToggleMotionMode,
}: TopControlsProps) {
  const isPlaying = playback === "playing";
  const isWholeMap = cameraMode === "whole-map";
  const isReduced = motionMode === "reduced";

  return (
    <div
      role="toolbar"
      aria-label="workflow controls"
      className="flex items-center gap-1 px-3 py-2 bg-black/40 backdrop-blur border-b border-white/8 select-none"
    >
      {/* Navigation group */}
      <div className="flex items-center gap-1">
        <IconButton
          label="이전 장면"
          onClick={onPrevious}
          disabled={!canGoPrevious}
        >
          <ChevronLeft size={18} />
        </IconButton>
        <IconButton
          label="다음 장면"
          onClick={onNext}
          disabled={!canGoNext}
        >
          <ChevronRight size={18} />
        </IconButton>
      </div>

      <div className="w-px h-5 bg-white/10 mx-1" aria-hidden />

      {/* Playback group */}
      <div className="flex items-center gap-1">
        <IconButton
          label="현재 장면 다시 재생"
          onClick={onReplay}
        >
          <RefreshCw size={16} />
        </IconButton>
        <IconButton
          label={isPlaying ? "자동 재생 일시정지" : "자동 재생 시작"}
          onClick={onTogglePlayback}
          active={isPlaying}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </IconButton>
      </div>

      <div className="w-px h-5 bg-white/10 mx-1" aria-hidden />

      {/* View group */}
      <div className="flex items-center gap-1">
        <IconButton
          label="전체 지도 보기"
          onClick={onToggleWholeMap}
          active={isWholeMap}
        >
          <Map size={16} />
        </IconButton>
        <IconButton
          label={isReduced ? "움직임 원래대로" : "움직임 줄이기"}
          onClick={onToggleMotionMode}
          active={isReduced}
        >
          {isReduced ? <Zap size={16} /> : <Wind size={16} />}
        </IconButton>
      </div>
    </div>
  );
}

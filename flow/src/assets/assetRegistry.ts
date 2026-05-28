/** Authoritative static asset paths and their roles in the app */
export const assetRegistry = {
  cover: {
    src: "/assets/workflow-cover.png",
    alt: "Codex workflow cover poster",
    role: "loading-poster" as const,
  },
  fallbackPoster: {
    src: "/assets/fallback-flow-poster.png",
    alt: "Codex workflow 3D fallback poster",
    role: "webgl-fallback" as const,
  },
  darkCanvasTexture: {
    src: "/assets/dark-canvas-texture.png",
    alt: "",
    role: "canvas-background-material" as const,
  },
  surfaceTexture: {
    src: "/assets/surface-texture.png",
    alt: "",
    role: "node-document-commit-material" as const,
  },
} as const;

export type AssetKey = keyof typeof assetRegistry;

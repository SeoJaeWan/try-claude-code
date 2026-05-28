import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FallbackView } from "../FallbackView";

describe("FallbackView WebGL 대체 화면", () => {
  it("WebGL을 사용할 수 없으면 fallback poster와 핵심 narrative 설명을 표시한다", () => {
    render(<FallbackView reason="webgl-unavailable" />);

    expect(screen.getByRole("img", { name: "Codex workflow 3D fallback poster" })).toHaveAttribute(
      "src",
      "/assets/fallback-flow-poster.png",
    );
    expect(screen.getByText(/brainstorm/)).toBeVisible();
    expect(screen.getByText(/plan-tdd/)).toBeVisible();
    expect(screen.getByText(/runner/)).toBeVisible();
    expect(screen.getByText(/main/)).toBeVisible();
  });

  it("reduced capability에서도 canvas 없이 현재 상태 설명과 진행 정보가 닫히지 않는다", () => {
    render(<FallbackView reason="reduced-capability" currentSceneLabel="dev-review rework" progressLabel="10 / 12" />);

    expect(screen.getByText("dev-review rework")).toBeVisible();
    expect(screen.getByText("10 / 12")).toBeVisible();
  });
});

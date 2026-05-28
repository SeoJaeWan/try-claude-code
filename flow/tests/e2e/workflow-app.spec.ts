/**
 * @surface_id flow-3d-workflow-app
 * @route /
 * @test_kind e2e-surface
 */
import { expect, test, type Page } from "@playwright/test";

async function expectCanvasHasNonBlankPixels(page: Page) {
  const sample = await page.getByTestId("workflow-canvas").evaluate(async (canvas) => {
    if (!(canvas instanceof HTMLCanvasElement)) {
      return { readable: false, reason: "not-canvas", distinctSamples: 0 };
    }

    const image = new Image();
    image.src = canvas.toDataURL("image/png");
    await image.decode();

    const probe = document.createElement("canvas");
    probe.width = image.width;
    probe.height = image.height;
    const context = probe.getContext("2d");
    if (!context) {
      return { readable: false, reason: "no-2d-context", distinctSamples: 0 };
    }
    context.drawImage(image, 0, 0);

    const points = [
      [0.2, 0.2],
      [0.5, 0.35],
      [0.7, 0.5],
      [0.35, 0.7],
      [0.8, 0.75],
    ];
    const colors = points.map(([x, y]) => {
      const px = Math.floor(probe.width * x);
      const py = Math.floor(probe.height * y);
      return Array.from(context.getImageData(px, py, 1, 1).data).join(",");
    });

    return { readable: true, distinctSamples: new Set(colors).size };
  });

  expect(sample).toMatchObject({ readable: true });
  expect(sample.distinctSamples).toBeGreaterThan(1);
}

test.describe("flow 3D workflow app", () => {
  test("desktop에서 앱을 열면 canvas, top controls, right inspector, bottom progress가 겹치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const canvas = page.getByTestId("workflow-canvas");
    const controls = page.getByRole("toolbar", { name: "workflow controls" });
    const inspector = page.getByRole("complementary", { name: "현재 workflow 설명" });
    const progress = page.getByRole("navigation", { name: "workflow 장면 진행" });

    await expect(canvas).toBeVisible();
    await expect(controls).toBeVisible();
    await expect(inspector).toBeVisible();
    await expect(progress).toBeVisible();

    const inspectorBox = await inspector.boundingBox();
    const progressBox = await progress.boundingBox();
    expect(inspectorBox!.x).toBeGreaterThan(900);
    expect(progressBox!.y).toBeGreaterThan(760);
    await expectCanvasHasNonBlankPixels(page);
  });

  test("mobile에서 앱을 열면 inspector가 bottom sheet로 전환되고 progress가 sheet 위에서 조작된다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const sheet = page.getByTestId("mobile-inspector-sheet");
    const progress = page.getByRole("navigation", { name: "workflow 장면 진행" });

    await expect(page.getByTestId("workflow-canvas")).toBeVisible();
    await expect(sheet).toBeVisible();
    await expect(progress).toBeVisible();

    const sheetBox = await sheet.boundingBox();
    const progressBox = await progress.boundingBox();
    expect(progressBox!.y + progressBox!.height).toBeLessThanOrEqual(sheetBox!.y);
  });

  test("사용자가 다음을 눌러 block 장면에 도달하면 업무 반환 arc와 사용자 navigation이 다른 위치와 역할로 보인다", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "다음 장면" }).click();
    await page.getByRole("button", { name: "다음 장면" }).click();
    await page.getByRole("button", { name: "다음 장면" }).click();

    await expect(page.getByTestId("scene-S04-plan-tdd-blocks-maker")).toBeVisible();
    await expect(page.getByTestId("return-arc-plan-tdd-to-plan-maker-block")).toBeVisible();
    await expect(page.getByText(/plan-tdd에서 plan-maker로 돌아가는/)).toBeVisible();
    await expect(page.getByRole("button", { name: "이전 장면" })).toHaveAttribute("data-navigation-control", "true");
    await expect(page.getByTestId("return-arc-plan-tdd-to-plan-maker-block")).not.toHaveAttribute(
      "data-navigation-control",
      "true",
    );
  });

  test("reduced motion을 켜면 긴 camera orbit과 packet loop가 줄고 장면 설명과 progress는 유지된다", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "움직임 줄이기" }).click();

    await expect(page.getByTestId("workflow-canvas")).toHaveAttribute("data-motion-mode", "reduced");
    await expect(page.getByTestId("workflow-packet")).toHaveAttribute("data-motion-behavior", "endpoint-snap");
    await expect(page.getByRole("complementary", { name: "현재 workflow 설명" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "workflow 장면 진행" })).toBeVisible();
  });

  test("WebGL fallback 경로에서는 fallback poster와 핵심 흐름 설명이 표시된다", async ({ page }) => {
    await page.goto("/?forceFallback=webgl");

    await expect(page.getByTestId("workflow-fallback")).toBeVisible();
    await expect(page.getByRole("img", { name: "Codex workflow 3D fallback poster" })).toHaveAttribute(
      "src",
      /\/assets\/fallback-flow-poster\.png$/,
    );
    await expect(page.getByText(/brainstorm/)).toBeVisible();
    await expect(page.getByText(/runner/)).toBeVisible();
    await expect(page.getByText(/main/)).toBeVisible();
  });

  test("최종 장면까지 진행하면 commit 누적, review feedback return, merge 선택, main end state가 보인다", async ({ page }) => {
    await page.goto("/");

    for (let i = 0; i < 11; i += 1) {
      await page.getByRole("button", { name: "다음 장면" }).click();
    }

    await expect(page.getByTestId("scene-S12-final-main-merge")).toBeVisible();
    await expect(page.getByTestId("commit-card-stack")).toContainText("phase");
    await expect(page.getByTestId("review-feedback-return")).toBeVisible();
    await expect(page.getByText(/merge를 선택/)).toBeVisible();
    await expect(page.getByTestId("main-end-state")).toHaveAttribute("data-complete", "true");
    await expect(page.getByRole("navigation", { name: "workflow 장면 진행" })).toContainText("12 / 12");
  });
});

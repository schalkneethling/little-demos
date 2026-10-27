import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { RUNTIME_ASSET_MANIFEST } from "../../src/assets/runtime/asset-manifest";

const availableDemoIds = [
  "dynamic-javascript-imports",
  "accent-color",
  "crisp-edges",
  "layer-cake",
  "property-transition",
  "zipper",
] as const;
const initialArtKeys = RUNTIME_ASSET_MANIFEST.assets
  .filter(({ loadGroup }) => loadGroup === "initial-world")
  .map(({ key }) => key);
const visualScreenshotStyle =
  "body { visibility: hidden !important; } [data-world-canvas] canvas { visibility: visible !important; }";

async function expectInitialArtSettled(page: Page) {
  expect(initialArtKeys).toHaveLength(9);
  const canvasParent = page.locator("[data-world-canvas]");
  await expect(canvasParent).toHaveAttribute("data-world-art-ready", "true");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  await expect
    .poll(async () => JSON.parse((await canvasParent.getAttribute("data-world-art-state")) ?? "{}"))
    .toEqual(Object.fromEntries(initialArtKeys.map((key) => [key, "ready"])));
}

async function settleRendering(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

test("the complete fairground is deterministic and matches the reviewed Linux rendering", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1_920, height: 1_280 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.addInitScript(() => window.localStorage.clear());

  const capture = async () => {
    await page.goto("/?debug-world&visual-test=arcade");
    await expectInitialArtSettled(page);
    await expect(page.locator("[data-world-canvas]")).toHaveAttribute("data-player-frame", "0");
    await page.addStyleTag({ content: visualScreenshotStyle });
    await settleRendering(page);
    const canvas = page.locator("[data-world-canvas] canvas");
    expect(await canvas.boundingBox()).toEqual({ x: 0, y: 0, width: 1_920, height: 1_280 });
    return canvas.screenshot({
      animations: "disabled",
      style: visualScreenshotStyle,
    });
  };

  const first = await capture();
  const second = await capture();
  await testInfo.attach("fairground-deterministic-scene", {
    body: second,
    contentType: "image/png",
  });
  expect(createHash("sha256").update(second).digest("hex")).toBe(
    createHash("sha256").update(first).digest("hex"),
  );
  await expect(page.locator("[data-world-canvas] canvas")).toHaveScreenshot(
    "fairground-overview.png",
    {
      animations: "disabled",
      maxDiffPixels: 0,
      threshold: 0,
    },
  );
});

test("all six visited labels survive a reload as directory text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  await page.locator("[data-demo-directory] summary").click();

  for (const demoId of availableDemoIds) {
    await page.locator(`[data-open-demo="${demoId}"]`).click();
    await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
    await page.getByRole("button", { name: "Close demo", exact: true }).click();
    await expect(page.locator(`[data-visited="${demoId}"]`)).toHaveText("Visited");
  }

  await page.reload();
  await expect(page.locator("[data-explore]")).toBeEnabled();
  await page.locator("[data-demo-directory] summary").click();
  for (const demoId of availableDemoIds) {
    await expect(page.locator(`[data-visited="${demoId}"]`)).toHaveText("Visited");
  }
});

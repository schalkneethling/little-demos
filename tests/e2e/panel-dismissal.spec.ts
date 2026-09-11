import { expect, test } from "@playwright/test";

test("an expanded panel paints above overlapping closed toggles", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-camera-controls] summary").click();
  const camera = page.locator("[data-camera-controls]");
  const directory = page.locator("[data-demo-directory]");
  const overlapIsCamera = await camera.evaluate((panel) => {
    const other = document.querySelector("[data-demo-directory]")!;
    const a = panel.getBoundingClientRect();
    const b = other.getBoundingClientRect();
    const x = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2;
    const y = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2;
    return panel.contains(document.elementFromPoint(x, y));
  });
  expect(overlapIsCamera).toBe(true);
  await expect(camera).toHaveCSS("z-index", "40");
  await expect(camera.locator("summary")).toHaveCSS("z-index", "40");
  await expect(directory).toHaveCSS("z-index", "30");
  await page.keyboard.press("Escape");
  await expect(camera).toHaveCSS("z-index", "30");
  await expect(camera.locator("summary")).toHaveCSS("z-index", "30");
});

for (const width of [1280, 375, 320]) {
  test(`panel toggles are equal-sized and side by side at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const directory = await page.locator("[data-demo-directory]").boundingBox();
    const controls = await page.locator("[data-camera-controls]").boundingBox();
    expect(directory).not.toBeNull();
    expect(controls).not.toBeNull();
    if (!directory || !controls) throw new Error("Panel toggles are missing");
    expect(directory.y).toBe(controls.y);
    expect(directory.width).toBeCloseTo(controls.width, 1);
    expect(directory.height).toBeCloseTo(controls.height, 1);
    expect(controls.x - (directory.x + directory.width)).toBeGreaterThanOrEqual(12);
    expect(directory.x).toBeGreaterThanOrEqual(12);
    expect(controls.x + controls.width).toBeLessThanOrEqual(width - 12);
    expect(directory.height).toBeGreaterThanOrEqual(44);
  });
}

test("collapsed panel toggles retain visible focus in Tab order", async ({ page }) => {
  await page.goto("/");
  const explore = page.locator("[data-control-deck] summary");
  await explore.focus();
  await page.keyboard.press("Escape");

  for (const selector of [
    "[data-control-deck]",
    "[data-demo-directory]",
    "[data-camera-controls]",
  ]) {
    const panel = page.locator(selector);
    const summary = panel.locator("summary");
    await expect(summary).toBeFocused();
    await expect(summary).toHaveCSS("outline-style", "solid");
    await expect(panel).toHaveCSS("overflow", "visible");
    await page.keyboard.press("Tab");
  }
});

for (const selector of ["[data-demo-directory]", "[data-camera-controls]", "[data-control-deck]"]) {
  test(`${selector} dismisses with Escape and outside clicks`, async ({ page }) => {
    await page.goto("/");
    const panel = page.locator(selector);
    const summary = panel.locator("summary");
    if ((await panel.getAttribute("open")) === null) await summary.click();
    await summary.focus();
    await page.keyboard.press("Escape");
    await expect(panel).not.toHaveAttribute("open", "");
    await expect(summary).toBeFocused();
    await summary.click();
    await page.getByRole("heading", { name: "Little Demos", exact: true }).click();
    await expect(panel).not.toHaveAttribute("open", "");
  });
}

test("inside actions remain usable and modal Escape does not dismiss its parent panel", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Browse all demos" }).click();
  const directory = page.locator("[data-demo-directory]");
  const open = page.locator('[data-open-demo="zipper"]');
  await open.click();
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
  await expect(directory).toHaveAttribute("open", "");
  await expect(open).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(directory).not.toHaveAttribute("open", "");
  await expect(directory.locator("summary")).toBeFocused();
});

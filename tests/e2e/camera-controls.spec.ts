import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("camera buttons form a directional pad with an evenly spaced zoom row", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-camera-controls] summary").click();
  await expect(page.locator(".camera-controls-content > *")).toHaveCount(5);
  expect(
    await page
      .locator(".camera-controls-content")
      .evaluate((element) =>
        Array.from(element.children, (child) => child.className || child.tagName.toLowerCase()),
      ),
  ).toEqual(["camera-pan", "p", "camera-zoom", "p", "button"]);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = async (action: string) =>
      (await page.locator(`[data-camera-action="${action}"]`).boundingBox())!;
    const up = await bounds("up"),
      left = await bounds("left"),
      down = await bounds("down"),
      right = await bounds("right");
    expect(up.y + up.height).toBeLessThan(left.y);
    expect(left.y).toBeCloseTo(down.y, 1);
    expect(down.y).toBeCloseTo(right.y, 1);
    expect(up.x).toBeCloseTo(down.x, 1);
    expect(left.x).toBeLessThan(down.x);
    expect(down.x).toBeLessThan(right.x);
    for (const button of [up, left, down, right]) {
      expect(button.width).toBeGreaterThanOrEqual(44);
      expect(button.width).toBeLessThanOrEqual(56);
      expect(button.height).toBeCloseTo(button.width);
    }
    const out = await bounds("out"),
      zoomIn = await bounds("in");
    expect(out.x).toBeCloseTo(left.x);
    expect(zoomIn.x + zoomIn.width).toBeCloseTo(right.x + right.width);
    expect(out.width).toBeGreaterThanOrEqual(44);
    expect(out.height).toBeGreaterThanOrEqual(44);
  }
});

test("mouse drag, wheel pan, zoom, and accessible return work without moving the player", async ({
  page,
}) => {
  await page.goto("/?debug-world");
  const panel = page.locator("[data-camera-controls]");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  const player = page.locator("[data-debug-position]");
  await expect(player).toContainText("960");
  const position = await player.textContent();
  await page.mouse.move(700, 450);
  await page.mouse.down();
  await page.mouse.move(850, 550, { steps: 10 });
  await page.mouse.up();
  await expect(panel.locator("[data-camera-status]")).toContainText("Looking around");
  const x = Number(await panel.getAttribute("data-camera-x"));
  await page.mouse.wheel(140, -100);
  await expect
    .poll(async () => Number(await panel.getAttribute("data-camera-x")))
    .toBeGreaterThan(x);
  await page.keyboard.down("Alt");
  await page.mouse.wheel(0, -150);
  await page.keyboard.up("Alt");
  await expect.poll(async () => Number(await panel.getAttribute("data-zoom"))).toBeGreaterThan(1);
  await expect(player).toHaveText(position!);
  await panel.locator("summary").click();
  const returnButton = page.getByRole("button", { name: "Return to player", exact: true });
  await returnButton.focus();
  await page.keyboard.press("Enter");
  await expect(returnButton).toBeFocused();
  await expect(panel.locator("[data-camera-status]")).toHaveText("Following player.");
  await expect(panel).toHaveAttribute("data-zoom", "1");
  await page.getByRole("button", { name: "Pan left", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const manualZoom = await panel.getAttribute("data-zoom");
  await page.locator("[data-control-deck] summary").click();
  await page.locator("[data-explore]").click();
  await page.keyboard.press("ArrowRight");
  await expect(panel.locator("[data-camera-status]")).toHaveText("Following player.");
  await expect(panel).toHaveAttribute("data-zoom", manualZoom!);
  await page.keyboard.press("Escape");
  await page.mouse.click(700, 450);
  await expect(page.locator("[data-world-control]")).toBeFocused();
});

test("camera zoom stays bounded when zooming and resizing", async ({ page }) => {
  // 24 real clicks plus a large WebGL resize can be slow on software-rendered CI.
  test.setTimeout(90_000);
  await page.goto("/");
  const panel = page.locator("[data-camera-controls]");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  await panel.locator("summary").click();
  for (let i = 0; i < 12; i++)
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  const viewport = page.viewportSize()!;
  await expect
    .poll(async () => Number(await panel.getAttribute("data-zoom")))
    .toBeCloseTo(Math.max(viewport.width / 1920, viewport.height / 1280));
  await page.setViewportSize({ width: 2560, height: 1440 });
  await expect
    .poll(async () => Number(await panel.getAttribute("data-zoom")))
    .toBeGreaterThanOrEqual(4 / 3);
  const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
  await expect(panel).toBeVisible();
  await expect(zoomIn).toBeVisible();
  await expect(zoomIn).toBeEnabled();
  await zoomIn.click({ trial: true });
  // Seven increments exceed the upper bound from the resized minimum of 4/3.
  for (let i = 0; i < 7; i++) await zoomIn.click();
  await expect(panel).toHaveAttribute("data-zoom", "4");
});

test("camera controls preserve browser zoom gestures and stay inert behind dialogs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  const world = page.locator("[data-world-control]");
  const prevented = await world.evaluate((element) => {
    const wheel = new WheelEvent("wheel", {
      ctrlKey: true,
      deltaY: -100,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(wheel);
    return wheel.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await page.getByRole("link", { name: "Browse all demos" }).click();
  await page.locator('[data-open-demo="zipper"]').click();
  const panel = page.locator("[data-camera-controls]");
  const zoom = await panel.getAttribute("data-zoom");
  await world.dispatchEvent("wheel", { altKey: true, deltaY: -500 });
  await expect(panel).toHaveAttribute("data-zoom", zoom!);
  await page.keyboard.press("Escape");
  await page.locator("[data-demo-directory] summary").click();
  await panel.locator("summary").click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = (await panel.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
});

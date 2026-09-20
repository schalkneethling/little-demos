import { expect, test, type Page } from "@playwright/test";

const attractions = [
  {
    demoId: "dynamic-javascript-imports",
    title: "Dynamic JavaScript Imports",
    position: "x 360, y 1085",
    exitPosition: "x 360, y 1160",
  },
  { demoId: "zipper", title: "Zipper", position: "x 355, y 445", exitPosition: "x 355, y 510" },
  {
    demoId: "accent-color",
    title: "Accent Color",
    position: "x 1565, y 445",
    exitPosition: "x 1565, y 510",
  },
  {
    demoId: "property-transition",
    title: "Property Transitions",
    position: "x 960, y 305",
    exitPosition: "x 960, y 405",
  },
  {
    demoId: "layer-cake",
    title: "Layer Cake",
    position: "x 680, y 1075",
    exitPosition: "x 680, y 1175",
  },
  {
    demoId: "crisp-edges",
    title: "Crisp Edges",
    position: "x 1240, y 1075",
    exitPosition: "x 1240, y 1175",
  },
] as const;

/** Read-only diagnostics observe real keyboard movement; no position writes or teleports. */
async function walkTo(page: Page, key: "ArrowUp" | "ArrowLeft" | "ArrowRight", target: number) {
  const axis = key === "ArrowUp" ? "y" : "x";
  await page.keyboard.down(key);
  try {
    const coordinate = expect.poll(
      async () => {
        const value = await page.locator("[data-world-canvas]").getAttribute(`data-player-${axis}`);
        return value === null ? Number.NaN : Number(value);
      },
      { timeout: 15_000, intervals: [25], message: `${key} reaches ${axis} ${target}` },
    );
    if (key === "ArrowRight") await coordinate.toBeGreaterThanOrEqual(target);
    else await coordinate.toBeLessThanOrEqual(target);
  } finally {
    await page.keyboard.up(key);
  }
}

test("all six demos support Locate, exit and a keyboard-only revisit", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?debug-world");
  await expect(page.locator("[data-explore]")).toBeEnabled();

  for (const attraction of attractions) {
    await page.locator("[data-demo-directory] summary").click();
    await page.locator(`[data-locate-demo="${attraction.demoId}"]`).click();
    await expect(page.locator("[data-world-control]")).toBeFocused();
    await expect(page.locator("[data-debug-position]")).toHaveText(attraction.position);
    await expect(page.locator("[data-attraction-prompt]")).toContainText(attraction.title);

    await page.keyboard.press("Enter");
    await expect(page.locator("[data-demo-title]")).toHaveText(attraction.title);
    await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
    await page.getByRole("button", { name: "Close demo", exact: true }).click();
    await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
    await expect(page.locator("[data-world-control]")).toBeFocused();
    await expect(page.locator("[data-debug-position]")).toHaveText(attraction.exitPosition);
    await expect(page.locator("[data-attraction-prompt]")).not.toBeVisible();

    // Re-enter from the exit with real movement, not a second Locate teleport.
    // This also fails if closing leaves input inactive or the physics scene paused.
    await page.keyboard.down("ArrowUp");
    try {
      await expect(page.locator("[data-attraction-prompt]")).toContainText(attraction.title, {
        timeout: 10_000,
      });
    } finally {
      await page.keyboard.up("ArrowUp");
    }
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-demo-title]")).toHaveText(attraction.title);
    await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
    await page.getByRole("button", { name: "Close demo", exact: true }).click();
    await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
    await expect(page.locator("[data-world-control]")).toBeFocused();
    await expect(page.locator("[data-debug-position]")).toHaveText(attraction.exitPosition);
    await expect(page.locator("[data-attraction-prompt]")).not.toBeVisible();
  }

  await page.locator("[data-demo-directory] summary").click();
  for (const { demoId } of attractions) {
    await expect(page.locator(`[data-visited="${demoId}"]`)).toHaveText("Visited");
  }
  const funhouse = page
    .locator("[data-directory-list] > li")
    .filter({ has: page.getByRole("heading", { name: "Funhouse", exact: true }) });
  await expect(funhouse.getByRole("button", { name: "Locate in fairground" })).toHaveCount(0);
});

for (const route of [
  { side: "west", key: "ArrowLeft", x: 730, returnKey: "ArrowRight" },
  { side: "east", key: "ArrowRight", x: 1190, returnKey: "ArrowLeft" },
] as const) {
  test(`keyboard traversal from spawn reaches the stage via the ${route.side} plaza bypass`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?debug-world");
    await page.locator("[data-explore]").click();
    await expect(page.locator("[data-world-control]")).toBeFocused();
    await expect(page.locator("[data-debug-position]")).toHaveText("x 960, y 1120");

    // Stay below the plaza until reaching its side route; then cross above it.
    // The same body used in play must clear each bend before the next leg starts.
    await walkTo(page, "ArrowUp", 835);
    await walkTo(page, route.key, route.x);
    await walkTo(page, "ArrowUp", 380);
    await walkTo(page, route.returnKey, 960);
    await walkTo(page, "ArrowUp", 350);
    await expect(page.locator("[data-attraction-prompt]")).toContainText("Property Transitions");
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-demo-title]")).toHaveText("Property Transitions");
    await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  });
}

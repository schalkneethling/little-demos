import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";

const artKeys = [
  "attraction/arcade/base",
  "player/walk",
  "prop/planter",
  "surface/ground/grass-a",
  "surface/path/clay",
] as const;
const arcadeImage = /\/base(?:-[\w-]+)?\.png(?:\?.*)?$/;
const playerImage = /\/walk(?:-[\w-]+)?\.png(?:\?.*)?$/;
const grassImage = /\/grass-a(?:-[\w-]+)?\.png(?:\?.*)?$/;
const runtimeImage = /\/(?:base|walk|planter|grass-a|clay)(?:-[\w-]+)?\.png(?:\?.*)?$/;
// Locator screenshots include overlapping siblings. Compare world art, not the
// HTML shell (covered by the separate UI/a11y tests in the same pinned container).
// Visibility preserves layout; every canvas pixel, including labels, stays visible.
const visualScreenshotStyle =
  "body { visibility: hidden !important; } [data-world-canvas] canvas { visibility: visible !important; }";

async function expectArtSettled(page: Page, failedKeys: readonly string[] = []) {
  const canvasParent = page.locator("[data-world-canvas]");
  await expect(canvasParent).toHaveAttribute("data-world-art-ready", "true");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  await expect
    .poll(async () => JSON.parse((await canvasParent.getAttribute("data-world-art-state")) ?? "{}"))
    .toEqual(
      Object.fromEntries(
        artKeys.map((key) => [key, failedKeys.includes(key) ? "fallback" : "ready"]),
      ),
    );
}

async function locateArcade(page: Page) {
  await page.getByRole("link", { name: "Browse all demos" }).click();
  await page.locator('[data-locate-demo="dynamic-javascript-imports"]').click();
  await expect(page.locator("[data-world-control]")).toBeFocused();
  await expect(page.locator("[data-debug-position]")).toHaveText("x 360, y 1085");
  await expect(page.locator("[data-attraction-prompt]")).toContainText(
    "Dynamic JavaScript Imports",
  );
}

async function expectPlayerPoint(page: Page, x: number, y: number) {
  const canvasParent = page.locator("[data-world-canvas]");
  await expect(canvasParent).toHaveAttribute("data-player-x", String(x));
  await expect(canvasParent).toHaveAttribute("data-player-y", String(y));
  await expect(canvasParent).toHaveAttribute("data-player-ground-x", String(x));
  await expect(canvasParent).toHaveAttribute("data-player-ground-y", String(y + 16));
}

test("the production world fetches and decodes all five modular art textures", async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  const responses = new Map<string, number>();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  page.on("response", (response) => {
    if (runtimeImage.test(response.url())) responses.set(response.url(), response.status());
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?debug-world");
  await expectArtSettled(page);
  expect(responses.size).toBe(5);
  expect([...responses.values()]).toEqual(Array(5).fill(200));
  expect(requests.some((url) => /\/art\/source\/|\/concepts\//.test(url))).toBe(false);
  await expectPlayerPoint(page, 960, 1120);
  await expect(page.locator("[data-world-canvas]")).toHaveAttribute("data-player-frame", "0");
  await page.locator("[data-explore]").click();
  const canvasParent = page.locator("[data-world-canvas]");
  for (const [key, idle] of [
    ["ArrowDown", 0],
    ["ArrowLeft", 4],
    ["ArrowRight", 8],
    ["ArrowUp", 12],
  ] as const) {
    await page.keyboard.down(key);
    try {
      await expect
        .poll(async () => {
          const frame = Number(await canvasParent.getAttribute("data-player-frame"));
          return frame > idle && frame < idle + 4;
        })
        .toBe(true);
      await expect
        .poll(() =>
          canvasParent.evaluate((element) => {
            const data = (element as HTMLElement).dataset;
            return Number(data.playerGroundY) - Number(data.playerY);
          }),
        )
        .toBeCloseTo(16);
      await expect
        .poll(() =>
          canvasParent.evaluate((element) => {
            const data = (element as HTMLElement).dataset;
            return Number(data.playerGroundX) - Number(data.playerX);
          }),
        )
        .toBe(0);
    } finally {
      await page.keyboard.up(key);
    }
    await expect(canvasParent).toHaveAttribute("data-player-frame", String(idle));
  }
  expect(errors).toEqual([]);
});

test("art diagnostic hooks stay absent during ordinary browsing", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  const canvasParent = page.locator("[data-world-canvas]");
  await expect(canvasParent).not.toHaveAttribute("data-world-art-ready");
  await expect(canvasParent).not.toHaveAttribute("data-world-art-state");
  await expect(canvasParent).not.toHaveAttribute("data-player-x");
});

for (const failure of ["fetch", "decode"] as const) {
  test(`arcade ${failure} failure falls back without losing activation or the exit route`, async ({
    page,
  }) => {
    const errors: string[] = [];
    let intercepted = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route(arcadeImage, async (route) => {
      intercepted += 1;
      if (failure === "fetch") await route.abort();
      else
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: "This response is deliberately not a decodable PNG.",
        });
    });
    await page.goto("/?debug-world");
    await expectArtSettled(page, ["attraction/arcade/base"]);
    // Phaser may retry transport failures; the ready/fallback assertion is the
    // application contract, not a single browser request attempt.
    expect(intercepted).toBeGreaterThan(0);
    await locateArcade(page);
    await expectPlayerPoint(page, 360, 1085);
    await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
    await page.getByRole("button", { name: "Close demo", exact: true }).click();
    await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
    await expect(page.locator("[data-world-control]")).toBeFocused();
    await expect(page.locator("[data-debug-position]")).toHaveText("x 360, y 1160");
    await expectPlayerPoint(page, 360, 1160);
    await expect(page.locator('[data-visited="dynamic-javascript-imports"]')).toHaveText("Visited");
    await expect(page.locator("[data-attraction-prompt]")).not.toBeVisible();

    // A real key press after exit proves fallback art did not leave the world paused.
    await page.keyboard.down("ArrowRight");
    try {
      await expect
        .poll(async () =>
          Number(await page.locator("[data-world-canvas]").getAttribute("data-player-x")),
        )
        .toBeGreaterThan(390);
    } finally {
      await page.keyboard.up("ArrowRight");
    }
    expect(errors).toEqual([]);
  });
}

test("a missing player sheet preserves the original player and body ground coordinates", async ({
  page,
}) => {
  let intercepted = false;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(playerImage, (route) => {
    intercepted = true;
    return route.abort();
  });
  await page.goto("/?debug-world");
  await expectArtSettled(page, ["player/walk"]);
  expect(intercepted).toBe(true);
  await expectPlayerPoint(page, 960, 1120);
  await locateArcade(page);
  await expectPlayerPoint(page, 360, 1085);
  await page.keyboard.down("ArrowRight");
  try {
    await expect
      .poll(async () =>
        Number(await page.locator("[data-world-canvas]").getAttribute("data-player-x")),
      )
      .toBeGreaterThan(390);
  } finally {
    await page.keyboard.up("ArrowRight");
  }
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("one failed ground texture keeps the world and unrelated artwork available", async ({
  page,
}) => {
  const errors: string[] = [];
  let intercepted = false;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(grassImage, (route) => {
    intercepted = true;
    return route.abort();
  });
  await page.goto("/?debug-world");
  await expectArtSettled(page, ["surface/ground/grass-a"]);
  expect(intercepted).toBe(true);
  await locateArcade(page);
  await expectPlayerPoint(page, 360, 1085);
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  expect(errors).toEqual([]);
});

test("a stalled initial image settles to fallback within the loading watchdog", async ({
  page,
}) => {
  test.setTimeout(30_000);
  let intercepted = false;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(arcadeImage, async (route) => {
    intercepted = true;
    await blocked;
    await route.abort();
  });
  try {
    const startedAt = Date.now();
    await page.goto("/?debug-world");
    await expect.poll(() => intercepted).toBe(true);
    await expect(page.locator("[data-explore]")).toBeDisabled();
    await expect(page.locator("[data-world-canvas]")).not.toHaveAttribute(
      "data-world-art-ready",
      "true",
    );
    // The loader has a 6s XHR timeout and 9s overall processing watchdog. Leave
    // bounded headroom for software-rendered CI, but never release the request
    // to make readiness pass: it must independently settle as a recoverable failure.
    await expect(page.locator("[data-world-canvas]")).toHaveAttribute(
      "data-world-art-ready",
      "true",
      {
        timeout: 15_000,
      },
    );
    await expectArtSettled(page, ["attraction/arcade/base"]);
    expect(Date.now() - startedAt).toBeLessThan(20_000);
    await locateArcade(page);
    await expectPlayerPoint(page, 360, 1085);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("art-backed player anchors survive camera zoom, return, and viewport resizing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?debug-world");
  await expectArtSettled(page);
  await locateArcade(page);
  await expectPlayerPoint(page, 360, 1085);
  await page.keyboard.press("Escape");
  const camera = page.locator("[data-camera-controls]");
  await camera.locator("summary").click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect.poll(async () => Number(await camera.getAttribute("data-zoom"))).toBeGreaterThan(1);
  await expectPlayerPoint(page, 360, 1085);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expectPlayerPoint(page, 360, 1085);
  await page.getByRole("button", { name: "Return to player", exact: true }).click();
  await expect(camera.locator("[data-camera-status]")).toHaveText("Following player.");
  await expect(camera).toHaveAttribute("data-zoom", "1");
  await expectPlayerPoint(page, 360, 1085);
  const worldBounds = await page.locator("[data-world-canvas]").boundingBox();
  expect(worldBounds).toEqual({ x: 0, y: 0, width: 1024, height: 768 });
});

test("the explicit arcade visual fixture renders identically across fresh loads", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.addInitScript(() => window.localStorage.clear());
  const capture = async () => {
    await page.goto("/?debug-world&visual-test=arcade");
    await expectArtSettled(page);
    await expectPlayerPoint(page, 360, 1120);
    await page.locator("[data-explore]").click();
    await page.addStyleTag({ content: visualScreenshotStyle });
    const canvasParent = page.locator("[data-world-canvas]");
    await expect(canvasParent).toHaveAttribute("data-player-frame", "0");
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    return canvasParent.locator("canvas").screenshot({
      animations: "disabled",
      style: visualScreenshotStyle,
    });
  };
  const first = await capture();
  const second = await capture();
  await testInfo.attach("arcade-deterministic-scene", { body: second, contentType: "image/png" });
  // Fresh-load equality catches nondeterminism separately from the reviewed
  // Linux-amd64 baseline's intentional visual-regression gate.
  expect(createHash("sha256").update(second).digest("hex")).toBe(
    createHash("sha256").update(first).digest("hex"),
  );
  await expect(page.locator("[data-world-canvas] canvas")).toHaveScreenshot("arcade-overview.png", {
    animations: "disabled",
    maxDiffPixels: 0,
    threshold: 0,
  });
});

for (const fixture of [
  { name: "arcade-behind", x: 360, y: 820 },
  { name: "arcade-west", x: 185, y: 940 },
  { name: "arcade-east", x: 535, y: 940 },
  { name: "arcade-exit", x: 360, y: 1160 },
]) {
  test(`${fixture.name} preserves reviewed player occlusion`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto(`/?debug-world&visual-test=${fixture.name}`);
    await expectArtSettled(page);
    await expectPlayerPoint(page, fixture.x, fixture.y);
    await page.locator("[data-explore]").click();
    await page.addStyleTag({ content: visualScreenshotStyle });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("[data-world-canvas] canvas")).toHaveScreenshot(
      `${fixture.name}.png`,
      { animations: "disabled", maxDiffPixels: 0, threshold: 0 },
    );
  });
}

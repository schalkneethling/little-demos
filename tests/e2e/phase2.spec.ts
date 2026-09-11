import { expect, test } from "@playwright/test";
import { chunks } from "../helpers/chunk-patterns";
import AxeBuilder from "@axe-core/playwright";
import { gzipSync, gunzipSync } from "node:zlib";
import { readFile, stat } from "node:fs/promises";

test("exploration minimizes its controls and they can be reopened", async ({ page }) => {
  await page.goto("/");
  const deck = page.locator("[data-control-deck]");
  const toggle = deck.locator("summary");
  await page.locator("[data-explore]").click();
  await expect(toggle).toBeVisible();
  await expect(deck).not.toHaveAttribute("open", "");
  await expect(page.locator("[data-explore]")).not.toBeVisible();
  await expect(page.locator("[data-world-control]")).toBeFocused();
  expect((await deck.boundingBox())!.height).toBeLessThan(90);
  await toggle.click();
  await expect(page.locator("[data-explore]")).toBeVisible();
  await expect(page.locator("[data-reduced-motion]")).toBeVisible();
  await page.locator("[data-explore]").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-explore]")).toBeFocused();
  await expect(page.locator("[data-explore]")).toBeVisible();
});

test("fairground fills the available viewport at desktop and phone sizes", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("[data-explore]")).toBeEnabled();
    const bounds = await page.locator("[data-world-canvas]").boundingBox();
    expect(bounds?.x).toBe(0);
    expect(bounds?.y).toBe(0);
    expect(bounds?.width).toBe(viewport.width);
    expect(bounds?.height).toBe(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  }
});

for (const demo of ["dynamic-javascript-imports", "zipper"]) {
  test(`${demo} opens from a deep link, contains focus, and cleans up on Escape`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/?demo=${demo}`);
    const dialog = page.locator("[data-demo-dialog]");
    await expect(dialog).toBeVisible();
    await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
    await expect(page.getByRole("button", { name: "Retry", exact: true })).not.toBeVisible();
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(dialog.locator("[data-demo-root] > *")).toHaveCount(0);
    await expect(page.locator("[data-demo-directory] summary")).toBeFocused();
    expect(new URL(page.url()).searchParams.has("demo")).toBe(false);
    expect(errors).toEqual([]);
  });
}

test("the dynamic import demo loads navigation on demand and responds to its buttons", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  expect(requests.some((url) => chunks.navigation.test(url))).toBe(false);
  await page.goto("/?demo=dynamic-javascript-imports");
  const track = page.getByRole("region", { name: "Cards with navigation", exact: true });
  await expect(track).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  expect(requests.some((url) => chunks.navigation.test(url))).toBe(true);
});

test("an unknown deep link leaves a usable document", async ({ page }) => {
  await page.goto("/?demo=does-not-exist");
  await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
  await expect(page.locator("[data-explore]")).toBeEnabled();
});

test("an explicit motion setting persists and mobile dialogs stay within the viewport", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("[data-reduced-motion]").check();
  await page.reload();
  await expect(page.locator("[data-reduced-motion]")).toBeChecked();
  await page.getByRole("link", { name: "Browse all demos" }).click();
  await page.locator('[data-open-demo="zipper"]').click();
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  const bounds = await page.locator("[data-demo-dialog]").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("Zipper compresses and decompresses real files", async ({ page }) => {
  const original = Buffer.from("Little Demos browser round trip. ".repeat(100));
  await page.goto("/?demo=zipper");
  await page.getByLabel("Choose a file", { exact: true }).setInputFiles({
    name: "sample.txt",
    mimeType: "text/plain",
    buffer: original,
  });
  await page.getByRole("button", { name: "Process file", exact: true }).click();
  const link = page.getByRole("link", { name: "Download file", exact: true });
  await expect(link).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await link.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sample.txt.gz");
  const path = await download.path();
  expect(path).not.toBeNull();
  expect((await stat(path!)).size).toBeLessThan(100_000);
  const compressed = await readFile(path!);
  expect(compressed.byteLength).toBeLessThan(100_000);
  expect(gunzipSync(compressed)).toEqual(original);
  await page.getByLabel("Operation", { exact: true }).selectOption("decompress");
  await page.getByLabel("Choose a file", { exact: true }).setInputFiles({
    name: "sample.txt.gz",
    mimeType: "application/gzip",
    buffer: gzipSync(original),
  });
  await page.getByRole("button", { name: "Process file", exact: true }).click();
  await expect(link).toBeVisible();
  const restoredPromise = page.waitForEvent("download");
  await link.click();
  const restored = await restoredPromise;
  expect(restored.suggestedFilename()).toBe("sample.txt");
  const restoredPath = (await restored.path())!;
  expect((await stat(restoredPath)).size).toBeLessThan(100_000);
  const bytes = await readFile(restoredPath);
  expect(bytes.byteLength).toBeLessThan(100_000);
  expect(bytes).toEqual(original);
});

test("directory opens both demos repeatedly and preserves visited state", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Browse all demos" }).click();
  for (let cycle = 0; cycle < 10; cycle += 1) {
    const id = cycle % 2 ? "zipper" : "dynamic-javascript-imports";
    const opener = page.locator(`[data-open-demo="${id}"]`);
    await opener.click();
    await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
    await page.getByRole("button", { name: "Close demo", exact: true }).click();
    await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
    await expect(opener).toBeFocused();
    await expect(page.locator("[data-demo-root] > *")).toHaveCount(0);
    await expect(page.locator(`[data-visited="${id}"]`)).toHaveText("Visited");
  }
  await page.reload();
  await expect(page.locator('[data-visited="zipper"]')).toHaveText("Visited");
  await expect(page.locator('[data-visited="dynamic-javascript-imports"]')).toHaveText("Visited");
  expect(errors).toEqual([]);
});

test("directory remains usable when the world cannot load", async ({ page }) => {
  let observed = false;
  await page.route(chunks.world, (route) => {
    observed = true;
    return route.abort();
  });
  await page.goto("/");
  await expect(page.locator("[data-world-status]")).toContainText("unavailable");
  expect(observed).toBe(true);
  await page.getByRole("link", { name: "Browse all demos" }).click();
  await page.locator('[data-open-demo="zipper"]').click();
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  await page.getByRole("button", { name: "Close demo", exact: true }).click();
  await expect(page.locator('[data-open-demo="zipper"]')).toBeFocused();
});

for (const reducedMotion of [false, true]) {
  test(`keyboard attraction loop and exit with reduced motion ${reducedMotion}`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
    await page.goto("/?debug-world");
    const world = page.locator("[data-world-control]");
    const prompt = page.locator("[data-attraction-prompt]");
    const dialog = page.locator("[data-demo-dialog]");
    await page.locator("[data-explore]").click();
    await expect(world).toBeFocused();
    await page.keyboard.down("ArrowLeft");
    await expect
      .poll(
        async () =>
          Number(
            (await page.locator("[data-debug-position]").textContent())?.match(/x (\d+)/)?.[1],
          ),
        { timeout: 20_000 },
      )
      .toBeLessThan(900);
    await expect(prompt).toBeVisible({ timeout: 20_000 });
    await page.keyboard.up("ArrowLeft");
    await expect(dialog).not.toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
    await page.getByRole("button", { name: "Next", exact: true }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(dialog).toBeVisible();
    await page.getByRole("button", { name: "Close demo", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(world).toBeFocused();
    await expect(page.locator("[data-world-status]")).toContainText("Exploring");
    await expect(page.locator('[data-visited="dynamic-javascript-imports"]')).toHaveText("Visited");
    const position = page.locator("[data-debug-position]");
    await expect(position).toContainText("y 1160");
    await page.keyboard.down("ArrowRight");
    await expect
      .poll(async () => Number((await position.textContent())?.match(/x (\d+)/)?.[1]))
      .toBeGreaterThan(400);
    await page.keyboard.up("ArrowRight");
  });
}

test("a failed demo import offers working Retry and Close actions", async ({ page }) => {
  let fail = true;
  await page.route(chunks.demo, (route) => {
    if (fail) {
      fail = false;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/?demo=dynamic-javascript-imports");
  await expect(page.locator("[data-demo-status]")).toContainText("could not load");
  expect(fail).toBe(false);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  await page.getByRole("button", { name: "Close demo", exact: true }).click();
  await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
});

test("closing while a demo import is pending prevents a late mount", async ({ page }) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let observed = false;
  await page.route(chunks.demo, async (route) => {
    observed = true;
    await blocked;
    await route.continue();
  });
  await page.goto("/?demo=dynamic-javascript-imports");
  await expect(page.locator("[data-demo-status]")).toHaveText("Loading demo…");
  await expect.poll(() => observed).toBe(true);
  await page.getByRole("button", { name: "Close demo", exact: true }).click();
  await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
  release();
  await expect(page.locator("[data-demo-root] > *")).toHaveCount(0);
});

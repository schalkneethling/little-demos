import { expect, test } from "@playwright/test";

const motionKey = "little-demos:motion";

async function seedMotionPreference(page: import("@playwright/test").Page, value: boolean) {
  await page.addInitScript(
    ({ key, reducedMotion }) => {
      localStorage.setItem(key, JSON.stringify({ version: 1, reducedMotion }));
    },
    { key: motionKey, reducedMotion: value },
  );
}

for (const preference of [
  { name: "legacy false follows the OS", saved: false, os: "reduce", expected: true },
  {
    name: "legacy true remains an explicit reduction",
    saved: true,
    os: "no-preference",
    expected: true,
  },
] as const) {
  test(`motion preference: ${preference.name}`, async ({ page }) => {
    await seedMotionPreference(page, preference.saved);
    await page.emulateMedia({ reducedMotion: preference.os });
    await page.goto("/");

    const checkbox = page.locator("[data-reduced-motion]");
    await expect(checkbox).toBeChecked({ checked: preference.expected });
    if (preference.saved) {
      await expect(page.locator("[data-use-system-motion]")).toBeVisible();
    } else {
      await expect(page.locator("[data-use-system-motion]")).toBeHidden();
    }
  });
}

test("system motion updates live and Use system setting clears a local override", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const checkbox = page.locator("[data-reduced-motion]");
  await expect(checkbox).not.toBeChecked();
  await expect(page.locator("[data-use-system-motion]")).toBeHidden();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeDisabled();
  await expect(checkbox).toHaveAccessibleDescription(
    "Your system setting requires reduced motion.",
  );
  await expect(page.locator("[data-motion-explanation]")).toHaveText(
    "Your system setting requires reduced motion.",
  );

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(checkbox).toBeEnabled();
  await expect(checkbox).toHaveAccessibleDescription("");
  await checkbox.check();
  await expect(page.locator("[data-use-system-motion]")).toBeVisible();
  await page.locator("[data-use-system-motion]").click();
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toBeFocused();
  await expect(page.locator("[data-use-system-motion]")).toBeHidden();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(checkbox).toBeChecked();
});

test("a missing or unavailable saved preference follows the OS and still works this session", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript((key) => {
    const originalSetItem = Object.getOwnPropertyDescriptor(Storage.prototype, "setItem")!.value;
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value(name: string, value: string) {
        if (name === key) throw new DOMException("Storage denied", "SecurityError");
        originalSetItem.call(this, name, value);
      },
    });
  }, motionKey);
  await page.goto("/");
  const checkbox = page.locator("[data-reduced-motion]");
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await expect(page.locator("[data-use-system-motion]")).toBeVisible();
});

test("keyboard movement and an attraction enter/exit remain usable with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?debug-world");
  await page.locator("[data-explore]").click();
  await expect(page.locator("[data-world-control]")).toBeFocused();
  const position = page.locator("[data-debug-position]");
  await expect(position).toHaveText("x 960, y 1120");
  await page.keyboard.down("ArrowUp");
  try {
    await expect
      .poll(async () => Number((await position.textContent())?.match(/y (\d+)/)?.[1]))
      .toBeLessThan(1120);
  } finally {
    await page.keyboard.up("ArrowUp");
  }
  await page.locator("[data-demo-directory] summary").click();
  await page.locator('[data-locate-demo="property-transition"]').click();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-demo-title]")).toHaveText("Property Transitions");
  await page.getByRole("button", { name: "Close demo", exact: true }).click();
  await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
  await expect(page.locator("[data-world-control]")).toBeFocused();
  await expect(page.locator("[data-attraction-prompt]")).not.toBeVisible();
});

test("the mounted property demo applies live motion changes without losing its input", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?demo=property-transition");
  const host = page.locator("[data-demo-root] [data-reduced-motion]");
  const cue = page.getByRole("checkbox", { name: "Run the midnight cue" });
  await expect(host).toHaveAttribute("data-reduced-motion", "false");
  await cue.check();
  await expect(page.locator("[data-cue-status]")).toHaveText("midnight");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(host).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.locator("[data-motion-note]")).toContainText("Reduced motion is enabled");
  await expect(cue).toBeChecked();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(host).toHaveAttribute("data-reduced-motion", "false");
  await expect(cue).toBeChecked();
});

test("enabling system reduction during an attraction exit settles it once and restores controls", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?debug-world");
  await page.locator("[data-demo-directory] summary").click();
  await page.locator('[data-locate-demo="property-transition"]').click();
  await expect(page.locator("[data-debug-position]")).toHaveText("x 960, y 305");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-demo-title]")).toHaveText("Property Transitions");
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  await page.clock.pauseAt(new Date("2026-01-01T01:00:00Z"));

  await page.getByRole("button", { name: "Close demo", exact: true }).click();
  await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
  await page.clock.runFor(150);
  const position = page.locator("[data-debug-position]");
  const art = page.locator("[data-world-canvas]");
  // Frame diagnostics are unthrottled; the text position updates only periodically.
  const midExitY = Number(await art.getAttribute("data-player-y"));
  expect(midExitY).toBeGreaterThan(305);
  expect(midExitY).toBeLessThan(405);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(16);
  await expect(art).toHaveAttribute("data-player-y", "405");
  await page.clock.runFor(1_000);

  await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
  await expect(page.locator("[data-world-control]")).toBeFocused();
  await expect(position).toHaveText("x 960, y 405");
  await page.keyboard.down("ArrowDown");
  try {
    await page.clock.runFor(200);
    expect(Number(await art.getAttribute("data-player-y"))).toBeGreaterThan(405);
  } finally {
    await page.keyboard.up("ArrowDown");
  }
});

test("a live system motion change preserves a manually positioned camera", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  const panel = page.locator("[data-camera-controls]");
  await panel.locator("summary").click();
  await page.getByRole("button", { name: "Pan left", exact: true }).click();
  await expect(panel.locator("[data-camera-status]")).toContainText("Looking around");
  const before = {
    x: await panel.getAttribute("data-camera-x"),
    y: await panel.getAttribute("data-camera-y"),
    zoom: await panel.getAttribute("data-zoom"),
  };
  expect(before.x).not.toBeNull();

  await page.emulateMedia({ reducedMotion: "reduce" });

  await expect(panel.locator("[data-camera-status]")).toContainText("Looking around");
  await expect(panel).toHaveAttribute("data-camera-x", before.x!);
  await expect(panel).toHaveAttribute("data-camera-y", before.y!);
  await expect(panel).toHaveAttribute("data-zoom", before.zoom!);
});

test("the introductory kicker is absent", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-eyebrow]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Little Demos", exact: true })).toBeVisible();
});

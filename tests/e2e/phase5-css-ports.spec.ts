import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("layer order changes the actual cascade while unique contributions survive", async ({
  page,
}) => {
  await page.goto("/?demo=layer-cake");
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  const icing = page.locator(".cake-icing");
  await expect(icing).toHaveCSS("background-color", "rgb(226, 88, 127)");
  const down = page.getByRole("button", { name: "Move base down" });
  await down.press("Enter");
  await expect(icing).toHaveCSS("background-color", "rgb(111, 67, 39)");
  await expect(page.getByRole("button", { name: "Move base down" })).toBeFocused();
  expect(
    await page
      .locator(".cake-flavour")
      .evaluate((element) => getComputedStyle(element, "::after").content),
  ).toBe('"chocolate icing"');
  await expect(page.locator(".cake-body")).toHaveCSS("border-bottom-right-radius", "17.6px");
  await expect(page.locator(".cake-flavour")).toHaveCSS("text-transform", "uppercase");
  await expect(page.locator(".code-statement")).toHaveText("@layer utils, base, components;");
  await expect(page.locator("[data-demo-status]")).toContainText("icing is chocolate");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(icing).toHaveCount(0);
  await page.getByRole("link", { name: "Browse all demos" }).click();
  await page.locator('[data-open-demo="layer-cake"]').click();
  await expect(icing).toHaveCSS("background-color", "rgb(226, 88, 127)");
});

test("property registration interpolates and disabling restores discrete changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?demo=property-transition");
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  const scene = page.locator(".spotlight-scene");
  const cue = page.getByRole("checkbox", { name: "Run the midnight cue" });
  await cue.press("Space");
  expect(await scene.evaluate((element) => element.getAnimations().length)).toBe(0);
  await page.getByRole("button", { name: "Register @property rules" }).press("Enter");
  const interpolated = await scene.evaluate((element) => {
    const root = element.getRootNode() as ShadowRoot;
    const checkbox = root.querySelector<HTMLInputElement>("#cue-switch")!;
    const property = (element as HTMLElement).dataset.angleProperty!;
    getComputedStyle(element).getPropertyValue(property);
    checkbox.click();
    getComputedStyle(element).getPropertyValue(property);
    const animations = element.getAnimations();
    for (const animation of animations) {
      animation.pause();
      animation.currentTime = 500;
    }
    return {
      count: animations.length,
      angle: Number.parseFloat(getComputedStyle(element).getPropertyValue(property)),
    };
  });
  expect(interpolated.count).toBeGreaterThan(0);
  expect(interpolated.angle).toBeGreaterThan(-34);
  expect(interpolated.angle).toBeLessThan(32);
  await page.getByRole("button", { name: "Disable @property rules" }).press("Enter");
  await expect(page.locator("style[data-property-transition-registry]")).toHaveCount(0);
  await cue.press("Space");
  expect(await scene.evaluate((element) => element.getAnimations().length)).toBe(0);
});

test("property registration is reversible on close and reduced motion skips interpolation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?demo=property-transition");
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  await page.getByRole("button", { name: "Register @property rules" }).click();
  const scene = page.locator(".spotlight-scene");
  const property = await scene.getAttribute("data-angle-property");
  expect(property).toBeTruthy();
  await page.getByRole("checkbox", { name: "Run the midnight cue" }).press("Space");
  expect(await scene.evaluate((element) => element.getAnimations().length)).toBe(0);
  await expect(page.locator("[data-demo-status]")).toHaveText(
    "Custom properties are registered. Current cue is midnight.",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator("style[data-property-transition-registry]")).toHaveCount(0);
  expect(
    await page.evaluate((name) => {
      const probe = document.createElement("div");
      probe.style.setProperty(name!, "not-an-angle");
      document.body.append(probe);
      const value = getComputedStyle(probe).getPropertyValue(name!);
      probe.remove();
      return value;
    }, property),
  ).toBe("not-an-angle");
  await page.getByRole("link", { name: "Browse all demos" }).click();
  await page.locator('[data-open-demo="property-transition"]').click();
  await expect(page.getByRole("button", { name: "Register @property rules" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByRole("checkbox", { name: "Run the midnight cue" })).not.toBeChecked();
});

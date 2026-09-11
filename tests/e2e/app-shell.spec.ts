import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function listenForKeyPrevention(page: Page) {
  await page.evaluate(() => {
    window.__littleDemosKeyPrevented = false;
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.code === "ArrowDown") {
          window.__littleDemosKeyPrevented = event.defaultPrevented;
        }
      },
      { once: true },
    );
  });
}

declare global {
  interface Window {
    __littleDemosKeyPrevented?: boolean;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Little Demos" })).toBeVisible();
  await expect(page.locator("[data-explore]")).toBeEnabled();
});

test("is an ordinary keyboard-navigable document before exploration starts", async ({ page }) => {
  const browse = page.getByRole("link", { name: "Browse all demos" });
  await browse.focus();
  await expect(browse).toBeFocused();

  await page.evaluate(() => window.scrollTo(0, 0));
  await listenForKeyPrevention(page);
  await page.keyboard.press("ArrowDown");

  await expect.poll(() => page.evaluate(() => window.__littleDemosKeyPrevented)).toBe(false);
  await expect(page.locator("[data-world-status]")).toContainText("Fairground ready");
});

test("Explore deliberately captures movement keys and Escape returns to the document", async ({
  page,
}) => {
  const world = page.locator("[data-world-control]");
  const explore = page.getByRole("button", { name: "Explore the fairground" });

  await explore.click();
  await expect(world).toBeFocused();
  await expect(page.locator("[data-world-status]")).toContainText("Exploring");

  await page.evaluate(() => window.scrollTo(0, 0));
  const scrollBeforeMovement = await page.evaluate(() => window.scrollY);
  await listenForKeyPrevention(page);
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => window.__littleDemosKeyPrevented)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBeforeMovement);

  await page.keyboard.press("Escape");
  await expect(explore).toBeFocused();
  await expect(page.locator("[data-world-status]")).toContainText("Exploration stopped");
});

test("leaving the world control stops exploration without a keyboard trap", async ({ page }) => {
  const world = page.locator("[data-world-control]");

  await page.getByRole("button", { name: "Explore the fairground" }).click();
  await expect(world).toBeFocused();
  await page.keyboard.press("Tab");

  await expect(page.locator("[data-world-status]")).toContainText("Exploration stopped");
});

test("has no automated accessibility violations in the initial shell", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});

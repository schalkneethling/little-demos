import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chunks } from "../helpers/chunk-patterns";

test("a failed validation module prevents world startup without losing the directory", async ({
  page,
}) => {
  let observed = false;
  await page.route(chunks.validation, (route) => {
    observed = true;
    return route.abort();
  });
  await page.goto("/");
  await expect(page.locator("[data-world-status]")).toHaveText("Fairground unavailable.");
  expect(observed).toBe(true);
  await expect(page.locator("[data-explore]")).toBeDisabled();
  await page.getByRole("link", { name: "Browse all demos" }).click();
  await page.locator('[data-open-demo="zipper"]').click();
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
});

test("the shared catalog exposes coming-soon entries without misleading actions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  await page.getByRole("link", { name: "Browse all demos" }).click();
  const entry = page
    .locator("[data-directory-list] > li")
    .filter({ has: page.getByRole("heading", { name: "Funhouse", exact: true }) });
  await expect(entry).toBeVisible();
  await expect(entry).toContainText(/coming soon/i);
  await expect(entry.getByRole("button")).toHaveCount(0);
  await expect(
    page
      .locator("[data-directory-list]")
      .getByRole("heading", { name: "Ferris wheel", exact: true }),
  ).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("a coming-soon deep link never mounts a demo or blocks available demos", async ({ page }) => {
  const imports: string[] = [];
  page.on("request", (request) => {
    if (chunks.demo.test(request.url())) imports.push(request.url());
  });
  await page.goto("/?demo=funhouse");
  await expect(page.locator("[data-explore]")).toBeEnabled();
  await expect(page.locator("[data-demo-dialog]")).not.toBeVisible();
  expect(imports).toEqual([]);
  await page.getByRole("link", { name: "Browse all demos" }).click();
  await page.locator('[data-open-demo="zipper"]').click();
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");
  await page.keyboard.press("Escape");
  expect(imports.length).toBeGreaterThan(0);
  await expect(page.locator('[data-open-demo="zipper"]')).toBeFocused();
});

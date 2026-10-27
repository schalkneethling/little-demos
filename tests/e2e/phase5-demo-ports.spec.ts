import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("accent-color keeps native controls keyboard-operable and applies the chosen theme", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?demo=accent-color");
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");

  const theme = page.getByLabel("Your theme", { exact: true });
  await theme.fill("#14001f");
  await expect
    .poll(() =>
      page
        .locator(".pizza-form")
        .evaluate((form) => (form as HTMLElement).style.getPropertyValue("--theme-color")),
    )
    .toBe("#14001f");

  const topping = page.getByRole("checkbox", { name: "Chocoholic", exact: true });
  await expect(topping).toHaveCSS("accent-color", "rgb(20, 0, 31)");
  await topping.focus();
  await page.keyboard.press("Space");
  await expect(topping).toBeChecked();
  await page.getByRole("button", { name: "Get baked", exact: true }).click();
  await expect(page.getByRole("status", { name: "Pizza order status" })).toContainText(
    "Chocoholic",
  );

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-demo-root] > *")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("crisp-edges updates scale and rendering with native keyboard controls", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/?demo=crisp-edges");
  await expect(page.locator("[data-demo-status]")).toHaveText("Demo ready.");

  const scale = page.getByRole("slider", { name: "Scale", exact: true });
  await scale.focus();
  await page.keyboard.press("ArrowRight");
  await expect(scale).toHaveValue("1.25");
  await expect(page.locator("#scale-value")).toHaveText("1.25×");
  await expect(page.locator("#size-label")).toHaveText("300 × 300 px (1.25×)");
  await expect(page.locator(".demo__stage")).toHaveCSS("transition-duration", "0s");

  const crisp = page.getByRole("checkbox", {
    name: "Enable image-rendering: crisp-edges",
    exact: true,
  });
  await crisp.focus();
  await page.keyboard.press("Space");
  await expect(crisp).toBeChecked();
  await expect(page.locator("#character")).toHaveCSS("image-rendering", "crisp-edges");
  await expect
    .poll(() =>
      page.locator("#character").evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(240);

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-demo-root] > *")).toHaveCount(0);
  expect(errors).toEqual([]);
});

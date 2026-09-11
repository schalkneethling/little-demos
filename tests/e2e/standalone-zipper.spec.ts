import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("standalone Zipper locks edits during processing and exposes status and focus", async ({
  page,
}) => {
  for (const file of ["index.html", "app.js", "streams.js", "styles.css"]) {
    await page.route(`**/standalone-zipper/${file}`, async (route) => {
      await route.fulfill({
        body: await readFile(new URL(`../../zipper/${file}`, import.meta.url)),
        contentType: file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : "text/html",
      });
    });
  }
  await page.goto("/standalone-zipper/index.html");
  const input = page.locator("input[type=file]");
  await input.focus();
  await expect(page.locator(".dropzone")).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("status")).toContainText("Select a file");
  await input.setInputFiles({
    name: "sample.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });
  await page.evaluate(() => {
    const tool = document.querySelector("gzip-tool") as unknown as {
      compressFile(): Promise<void>;
    };
    tool.compressFile = () =>
      new Promise<void>((resolve) =>
        window.addEventListener("finish-test-operation", () => resolve(), { once: true }),
      );
  });
  await page.locator(".action-button").click();
  for (const selector of [
    ".action-button",
    ".reset-button",
    "input[type=file]",
    "[data-mode=compress]",
    "[data-mode=decompress]",
  ]) {
    await expect(page.locator(selector)).toBeDisabled();
  }
  await expect(page.getByRole("status")).toContainText("Working");
  await page.evaluate(() => window.dispatchEvent(new Event("finish-test-operation")));
  await expect(page.locator(".reset-button")).toBeEnabled();
  await expect(input).toBeEnabled();
});

import { expect, test, vi } from "vite-plus/test";
import { transformGzip } from "../../zipper/streams.js";

test("standalone gzip rejects oversized sources before reading", async () => {
  const stream = vi.fn();
  await expect(transformGzip({ size: 101, stream }, false, 100)).rejects.toThrow(
    "processing limit",
  );
  expect(stream).not.toHaveBeenCalled();
});

test("standalone gzip bounds expanded output and round trips valid input", async () => {
  const source = new Blob(["a".repeat(2000)]);
  const compressed = await transformGzip(source);
  await expect(transformGzip(compressed, true, 100)).rejects.toThrow("processing limit");
  const restored = await transformGzip(compressed, true);
  expect(await restored.text()).toBe(await source.text());
});

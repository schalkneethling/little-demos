import { describe, expect, test } from "vite-plus/test";
import { processGzip, readGzipFilename } from "../../src/demos/zipper/gzip";

describe("bounded gzip processing", () => {
  test("compresses and decompresses bytes losslessly", async () => {
    const source = new Blob(["A small demo. ".repeat(100)]);
    const compressed = await processGzip(source, "compress", new AbortController().signal);
    expect(compressed.size).toBeLessThan(source.size);
    const restored = await processGzip(compressed, "decompress", new AbortController().signal);
    expect(await restored.text()).toBe(await source.text());
  });
  test("rejects oversized input before accessing its stream", async () => {
    let read = false;
    await expect(
      processGzip(
        {
          size: 20,
          stream: () => {
            read = true;
            throw new Error("Read");
          },
        } as unknown as Blob,
        "compress",
        new AbortController().signal,
        10,
      ),
    ).rejects.toThrow("limit");
    expect(read).toBe(false);
  });
  test("bounds decompressed output while reading", async () => {
    const compressed = await processGzip(
      new Blob(["a".repeat(10000)]),
      "compress",
      new AbortController().signal,
    );
    await expect(
      processGzip(compressed, "decompress", new AbortController().signal, 100),
    ).rejects.toThrow("limit");
  });
  test("rejects pre-aborted processing and invalid gzip", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(processGzip(new Blob(["a"]), "compress", controller.signal)).rejects.toThrow();
    await expect(
      processGzip(new Blob(["not gzip"]), "decompress", new AbortController().signal),
    ).rejects.toThrow();
  });

  test("recovers a bounded original filename without directory components", async () => {
    const header = new Uint8Array([0x1f, 0x8b, 8, 8, 0, 0, 0, 0, 0, 0]);
    expect(await readGzipFilename(new Blob([header, "folder/example.txt\0"]))).toBe("example.txt");
    expect(await readGzipFilename(new Blob([header, "x".repeat(600)]))).toBe("");
    expect(await readGzipFilename(new Blob(["not gzip"]))).toBe("");
  });
});

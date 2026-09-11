import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, test } from "vite-plus/test";
import {
  DEFAULT_ASSET_BUDGETS,
  exportAssetInventory,
  readFileBounded,
} from "../../scripts/assets/export-assets";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })));
});

async function createRoot() {
  const root = await mkdtemp(join(tmpdir(), "little-demos-assets-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "art/source/recipes"), { recursive: true });
  return root;
}

async function writeJson(root: string, path: string, value: unknown) {
  const absolutePath = join(root, path);
  await mkdir(join(absolutePath, ".."), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTransparentFixture(path: string, width = 40, height = 40) {
  await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}"><rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="#31777a"/></svg>`,
        ),
      },
    ])
    .png()
    .toFile(path);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function writeOversizedMetadataPng(path: string) {
  const png = await sharp({
    create: { width: 1, height: 1, channels: 4, background: "transparent" },
  })
    .png()
    .toBuffer();
  png.writeUInt32BE(5000, 16);
  png.writeUInt32BE(5000, 20);
  png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);
  await writeFile(path, png);
}

function rasterEntry(overrides: Record<string, unknown> = {}) {
  return {
    key: "attraction/arcade/base",
    kind: "transparent-raster",
    sourcePath: "art/source/arcade.png",
    runtimePath: "src/assets/runtime/attraction/arcade/base.png",
    sourceRect: { x: 0, y: 0, width: 40, height: 40 },
    output: { width: 32, height: 31 },
    contentBox: { x: 0, y: 0, width: 32, height: 31, gravity: "south" },
    anchor: { x: 16, y: 31 },
    loadGroup: "initial-world",
    dependsOn: [],
    fallback: { width: 300, height: 190, color: "#6388b8" },
    ...overrides,
  };
}

function surfaceEntry(overrides: Record<string, unknown> = {}) {
  return {
    key: "surface/ground/grass-a",
    kind: "deterministic-surface",
    recipePath: "art/source/recipes/grass.json",
    runtimePath: "src/assets/runtime/surface/ground/grass-a.png",
    seed: 42,
    alphaMode: "opaque-fill",
    output: { width: 32, height: 32 },
    loadGroup: "initial-world",
    dependsOn: [],
    fallback: { width: 32, height: 32, color: "#6d9a83" },
    ...overrides,
  };
}

const recipe = {
  version: 1,
  algorithm: "speckle-v1",
  baseColor: "#6d9a83",
  fleckColors: ["#739d87", "#67927c"],
  fleckCount: 16,
  minRadius: 1,
  maxRadius: 2,
};

describe("Phase 4 asset exporter", () => {
  test("rejects oversized and symbolic-link inputs before reading them", async () => {
    const root = await createRoot();
    const oversized = join(root, "oversized.json");
    await writeFile(oversized, "12345");

    await expect(readFileBounded(oversized, 4)).rejects.toThrow(/before read.*5.*4/i);

    const target = join(root, "target.json");
    const link = join(root, "link.json");
    await writeFile(target, "{}");
    await symlink(target, link);
    await expect(readFileBounded(link, 256)).rejects.toThrow(/symbolic link/i);
  });

  test("exports an explicitly cropped and contained transparent raster", async () => {
    const root = await createRoot();
    await writeTransparentFixture(join(root, "art/source/arcade.png"));
    await writeJson(root, "art/source/inventory.json", {
      version: 1,
      assets: [rasterEntry()],
    });

    const result = await exportAssetInventory({ rootDir: root });
    const [asset] = result.assets;
    expect(asset).toMatchObject({
      key: "attraction/arcade/base",
      width: 32,
      height: 31,
      anchor: { x: 16, y: 31 },
      decodedBytes: 32 * 31 * 4,
    });
    expect(asset?.transferBytes).toBeGreaterThan(0);
    expect(asset?.outputSha256).toMatch(/^[a-f\d]{64}$/);
    await expect(
      readFile(join(root, "src/assets/runtime/attraction/arcade/base.png")),
    ).resolves.not.toHaveLength(0);
    await expect(
      readFile(join(root, "src/assets/runtime/asset-manifest.ts"), "utf8"),
    ).resolves.toContain('new URL("./attraction/arcade/base.png?no-inline", import.meta.url).href');
  });

  test("rejects oversized source dimensions and opaque output borders", async () => {
    const oversizedRoot = await createRoot();
    await writeOversizedMetadataPng(join(oversizedRoot, "art/source/arcade.png"));
    await writeJson(oversizedRoot, "art/source/inventory.json", {
      version: 1,
      assets: [rasterEntry({ sourceRect: { x: 0, y: 0, width: 1, height: 1 } })],
    });
    await expect(exportAssetInventory({ rootDir: oversizedRoot })).rejects.toThrow(/pixel|limit/i);

    const opaqueRoot = await createRoot();
    await sharp({
      create: { width: 40, height: 40, channels: 4, background: "#31777a" },
    })
      .png()
      .toFile(join(opaqueRoot, "art/source/arcade.png"));
    await writeJson(opaqueRoot, "art/source/inventory.json", {
      version: 1,
      assets: [rasterEntry()],
    });
    await expect(exportAssetInventory({ rootDir: opaqueRoot })).rejects.toThrow(
      /transparent.*border|transparent and visible/i,
    );
  });

  test("normalizes every declared sheet frame to one stable registration", async () => {
    const root = await createRoot();
    await writeTransparentFixture(join(root, "art/source/player.png"), 80, 80);
    const sourceRects = Array.from({ length: 4 }, (_, index) => ({
      x: (index % 2) * 40,
      y: Math.floor(index / 2) * 40,
      width: 40,
      height: 40,
    }));
    await writeJson(root, "art/source/inventory.json", {
      version: 1,
      assets: [
        rasterEntry({
          key: "player/walk",
          sourcePath: "art/source/player.png",
          runtimePath: "src/assets/runtime/player/walk.png",
          output: { width: 68, height: 116 },
          contentBox: { x: 2, y: 0, width: 30, height: 54, gravity: "south" },
          anchor: { x: 17, y: 45 },
          frames: {
            columns: 2,
            rows: 2,
            frameWidth: 34,
            frameHeight: 58,
            sourceRects,
          },
          sourceRect: undefined,
        }),
      ],
    });

    const result = await exportAssetInventory({ rootDir: root });
    expect(result.assets[0]?.frames).toMatchObject({ columns: 2, rows: 2 });
    const metadata = await sharp(join(root, "src/assets/runtime/player/walk.png")).metadata();
    expect(metadata).toMatchObject({ width: 68, height: 116, hasAlpha: true });

    await writeJson(root, "art/source/inventory.json", {
      version: 1,
      assets: [
        rasterEntry({
          key: "player/walk",
          sourcePath: "art/source/player.png",
          frames: {
            columns: 2,
            rows: 2,
            frameWidth: 34,
            frameHeight: 58,
            sourceRects: sourceRects.slice(1),
          },
          sourceRect: undefined,
        }),
      ],
    });
    await expect(exportAssetInventory({ rootDir: root })).rejects.toThrow(/sourceRects.*4/i);
  });

  test("generates deterministic opaque surfaces with matching opposite seams", async () => {
    const root = await createRoot();
    await writeJson(root, "art/source/recipes/grass.json", recipe);
    await writeJson(root, "art/source/inventory.json", {
      version: 1,
      assets: [surfaceEntry()],
    });

    const first = await exportAssetInventory({ rootDir: root });
    const firstPng = await readFile(join(root, "src/assets/runtime/surface/ground/grass-a.png"));
    const second = await exportAssetInventory({ rootDir: root, check: true });
    expect(second).toEqual(first);
    expect(await readFile(join(root, "src/assets/runtime/surface/ground/grass-a.png"))).toEqual(
      firstPng,
    );

    const { data, info } = await sharp(firstPng)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let x = 0; x < info.width; x += 1) {
      const top = x * 4;
      const bottom = ((info.height - 1) * info.width + x) * 4;
      expect(data.subarray(top, top + 4)).toEqual(data.subarray(bottom, bottom + 4));
    }
    for (let y = 0; y < info.height; y += 1) {
      const left = y * info.width * 4;
      const right = (y * info.width + info.width - 1) * 4;
      expect(data.subarray(left, left + 4)).toEqual(data.subarray(right, right + 4));
    }
  });

  test("caps deterministic recipe work before drawing flecks", async () => {
    const root = await createRoot();
    await writeJson(root, "art/source/recipes/grass.json", {
      ...recipe,
      fleckCount: 2000,
      minRadius: 11,
      maxRadius: 11,
    });
    await writeJson(root, "art/source/inventory.json", {
      version: 1,
      assets: [surfaceEntry({ output: { width: 128, height: 128 } })],
    });
    await expect(exportAssetInventory({ rootDir: root })).rejects.toThrow(/draw-work cap/i);
  });

  test("rejects missing and cyclic dependencies independently", async () => {
    const root = await createRoot();
    await writeTransparentFixture(join(root, "art/source/arcade.png"));
    await writeJson(root, "art/source/inventory.json", {
      version: 1,
      assets: [rasterEntry({ dependsOn: ["prop/missing"] })],
    });
    await expect(exportAssetInventory({ rootDir: root })).rejects.toThrow(/missing dependency/i);

    await writeJson(root, "art/source/inventory.json", {
      version: 1,
      assets: [
        rasterEntry({ dependsOn: ["prop/planter"] }),
        rasterEntry({
          key: "prop/planter",
          runtimePath: "src/assets/runtime/prop/planter.png",
          dependsOn: ["attraction/arcade/base"],
        }),
      ],
    });
    await expect(exportAssetInventory({ rootDir: root })).rejects.toThrow(/dependency cycle/i);
  });

  test("rejects paths outside their roots and symbolic-link ancestors", async () => {
    for (const runtimePath of [
      "../outside.png",
      "src/assets/runtime/asset-manifest.ts",
      "src/assets/runtime/attraction/arcade/base.png?inline",
    ]) {
      const unsafeRoot = await createRoot();
      await writeJson(unsafeRoot, "art/source/inventory.json", {
        version: 1,
        assets: [rasterEntry({ runtimePath })],
      });
      await expect(exportAssetInventory({ rootDir: unsafeRoot })).rejects.toThrow(/runtimePath/i);
    }

    const linkedRoot = await createRoot();
    const realDirectory = join(linkedRoot, "real-source");
    await mkdir(realDirectory);
    await writeTransparentFixture(join(realDirectory, "arcade.png"));
    await symlink(realDirectory, join(linkedRoot, "art/source/linked"));
    await writeJson(linkedRoot, "art/source/inventory.json", {
      version: 1,
      assets: [rasterEntry({ sourcePath: "art/source/linked/arcade.png" })],
    });
    await expect(exportAssetInventory({ rootDir: linkedRoot })).rejects.toThrow(/symbolic link/i);

    const outputLinkedRoot = await createRoot();
    await writeTransparentFixture(join(outputLinkedRoot, "art/source/arcade.png"));
    await writeJson(outputLinkedRoot, "art/source/inventory.json", {
      version: 1,
      assets: [rasterEntry()],
    });
    const redirectedOutput = join(outputLinkedRoot, "redirected-output");
    await mkdir(join(outputLinkedRoot, "src/assets"), { recursive: true });
    await mkdir(redirectedOutput);
    await symlink(redirectedOutput, join(outputLinkedRoot, "src/assets/runtime"));
    await expect(exportAssetInventory({ rootDir: outputLinkedRoot })).rejects.toThrow(
      /symbolic link/i,
    );
    await expect(readFile(join(redirectedOutput, "attraction/arcade/base.png"))).rejects.toThrow();
  });

  test("rejects aggregate allocation budgets before reading image sources", async () => {
    const root = await createRoot();

    await writeJson(root, "art/source/inventory.json", {
      version: 1,
      assets: [rasterEntry()],
    });
    await expect(
      exportAssetInventory({
        rootDir: root,
        budgets: { ...DEFAULT_ASSET_BUDGETS, proofDecodedBytes: 1 },
      }),
    ).rejects.toThrow(/decoded.*budget/i);
  });

  test("check mode detects stale generated files without rewriting them", async () => {
    const root = await createRoot();
    await writeJson(root, "art/source/recipes/grass.json", recipe);
    await writeJson(root, "art/source/inventory.json", {
      version: 1,
      assets: [surfaceEntry()],
    });
    await exportAssetInventory({ rootDir: root });
    const output = join(root, "src/assets/runtime/surface/ground/grass-a.png");
    await writeFile(output, "stale");

    await expect(exportAssetInventory({ rootDir: root, check: true })).rejects.toThrow(
      /stale generated asset/i,
    );
    expect(await readFile(output, "utf8")).toBe("stale");
  });
});

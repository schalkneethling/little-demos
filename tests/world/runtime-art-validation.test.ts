import { describe, expect, test } from "vite-plus/test";
import type { AssetDefinition, RuntimeArtDefinition } from "../../src/world/assets/asset-types";
import { validateRuntimeAssets } from "../../src/world/assets/validate-runtime-assets";

function image(key = "image", patch: Partial<RuntimeArtDefinition> = {}): AssetDefinition {
  return {
    key,
    placeholder: { width: 300, height: 190, color: 0x123456 },
    runtime: {
      kind: "transparent-raster",
      url: "/image.png",
      width: 320,
      height: 310,
      anchor: { x: 160, y: 310 },
      loadGroup: "initial-world",
      dependsOn: [],
      transferBytes: 10,
      decodedBytes: 396800,
      outputSha256: "0".repeat(64),
      pixelSha256: "0".repeat(64),
      ...patch,
    },
  };
}

describe("runtime artwork validation", () => {
  test("accepts legacy placeholders and valid production metadata", () => {
    expect(
      validateRuntimeAssets([
        { key: "legacy", placeholder: { width: 10, height: 10, color: 0 } },
        image(),
      ]),
    ).toEqual([]);
  });
  test("rejects invalid anchors, image dimensions and frame geometry", () => {
    expect(validateRuntimeAssets([image("bad", { anchor: { x: 321, y: 10 } })])).toContain(
      "Invalid asset anchor: bad",
    );
    expect(validateRuntimeAssets([image("bad", { width: 320.5 })])).toContain(
      "Invalid runtime asset metadata: bad",
    );
    expect(
      validateRuntimeAssets([
        image("bad", { frames: { columns: 4, rows: 4, frameWidth: 34, frameHeight: 58 } }),
      ]),
    ).toContain("Invalid asset frames: bad");
  });
  test("validates frame-local player ground anchors, not whole-sheet anchors", () => {
    const player = image("player", {
      width: 136,
      height: 232,
      decodedBytes: 126208,
      frames: { columns: 4, rows: 4, frameWidth: 34, frameHeight: 58 },
      anchor: { x: 17, y: 45 },
    });
    expect(validateRuntimeAssets([player])).toEqual([]);
    expect(
      validateRuntimeAssets([
        { ...player, runtime: { ...player.runtime!, anchor: { x: 100, y: 100 } } },
      ]),
    ).toContain("Invalid asset anchor: player");
  });
  test("rejects even valid frame anchors when they would shift the existing player body", () => {
    const player = image("player/walk", {
      width: 136,
      height: 232,
      decodedBytes: 126208,
      frames: { columns: 4, rows: 4, frameWidth: 34, frameHeight: 58 },
      anchor: { x: 17, y: 45 },
    });
    player.placeholder = { width: 34, height: 58, color: 0 };
    expect(validateRuntimeAssets([player])).toEqual([]);
    expect(
      validateRuntimeAssets([
        { ...player, runtime: { ...player.runtime!, anchor: { x: 17, y: 58 } } },
      ]),
    ).toContain("Incompatible player artwork geometry: player/walk");
  });
  test("rejects missing, cyclic and incompatible loading dependencies", () => {
    expect(validateRuntimeAssets([image("a", { dependsOn: ["missing"] })])).toContain(
      "Missing runtime asset dependency: a -> missing",
    );
    expect(
      validateRuntimeAssets([image("a", { dependsOn: ["b"] }), image("b", { dependsOn: ["a"] })]),
    ).toContain("Cyclic asset dependency: a");
    expect(
      validateRuntimeAssets([
        image("a", { dependsOn: ["b"] }),
        image("b", { loadGroup: "deferred-world" }),
      ]),
    ).toContain("Initial asset depends on deferred asset: a");
  });
  test("rejects over-budget metadata and image properties on surfaces", () => {
    expect(validateRuntimeAssets([image("bad", { transferBytes: 2 * 1024 * 1024 + 1 })])).toContain(
      "Invalid runtime asset metadata: bad",
    );
    expect(
      validateRuntimeAssets([
        image("bad", { kind: "deterministic-surface", alphaMode: "opaque-fill" }),
      ]),
    ).toContain("Invalid surface metadata: bad");
  });
});

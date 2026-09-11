import { describe, expect, test } from "vite-plus/test";
import { ARCADE_PLANTERS } from "../../src/world/rendering/arcade-decoration";
import { ASSET_BY_KEY } from "../../src/world/assets/asset-registry";

describe("arcade decoration proportions and clearance", () => {
  test("staggered, substantial planters stay inside the existing solid footprint", () => {
    const asset = ASSET_BY_KEY.get("prop/planter")!.runtime!;
    expect(asset.width).toBe(48);
    expect(asset.height).toBe(56);
    expect(ARCADE_PLANTERS).toEqual([
      { x: 234, y: 1023 },
      { x: 437, y: 1055 },
    ]);
    for (const point of ARCADE_PLANTERS) {
      const left = point.x - asset.anchor!.x;
      const top = point.y - asset.anchor!.y;
      expect(left).toBeGreaterThanOrEqual(210);
      expect(left + asset.width).toBeLessThanOrEqual(510);
      expect(top).toBeGreaterThanOrEqual(870);
      expect(top + asset.height).toBeLessThanOrEqual(1060);
    }
  });
});

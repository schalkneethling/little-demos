import { describe, expect, test } from "vite-plus/test";
import { CATALOG } from "../../src/catalog/catalog";
import { validateCatalog } from "../../src/catalog/validate-catalog";
import { FAIRGROUND_MAP } from "../../src/world/map/fairground-map";

describe("optional production presentation placement", () => {
  test("requires explicit production placement but preserves legacy position-only fixtures", () => {
    const missing = {
      ...CATALOG,
      attractions: CATALOG.attractions.map((item) =>
        item.id === "arcade" ? { ...item, presentation: undefined } : item,
      ),
    };
    expect(validateCatalog(missing, FAIRGROUND_MAP)).toContain(
      "Invalid attraction presentation: arcade",
    );
    const legacy = {
      ...missing,
      attractions: missing.attractions.map((item) =>
        item.id === "arcade" ? { ...item, assetKey: "arcade-placeholder" } : item,
      ),
    };
    expect(validateCatalog(legacy, FAIRGROUND_MAP)).toEqual([]);
  });

  test("validates visible image bounds separately from unchanged collision", () => {
    const arcade = CATALOG.attractions.find((item) => item.id === "arcade")!;
    expect(arcade.collisionShapes).toEqual([
      { type: "rectangle", x: 210, y: 870, width: 300, height: 190 },
    ]);
    expect(arcade.position).toEqual({ x: 210, y: 870 });
    expect(
      validateCatalog(
        {
          ...CATALOG,
          attractions: CATALOG.attractions.map((item) =>
            item.id === "arcade"
              ? { ...item, presentation: { worldAnchor: { x: 360, y: 200 } } }
              : item,
          ),
        },
        FAIRGROUND_MAP,
      ),
    ).toContain("Attraction artwork is outside the map: arcade");
  });

  test("rejects a selected image whose anchor would make the picture jump", () => {
    const base = CATALOG.assets.find((item) => item.key === "attraction/arcade/base")!;
    const selected = {
      ...base,
      key: "attraction/arcade/selected",
      runtime: { ...base.runtime!, anchor: { x: 159, y: 310 } },
    };
    expect(
      validateCatalog(
        {
          ...CATALOG,
          assets: [...CATALOG.assets, selected],
          attractions: CATALOG.attractions.map((item) =>
            item.id === "arcade" ? { ...item, highlightAssetKey: selected.key } : item,
          ),
        },
        FAIRGROUND_MAP,
      ),
    ).toContain("Incompatible highlight artwork: arcade");
  });
});

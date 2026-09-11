import { describe, expect, test, vi } from "vite-plus/test";
import { CATALOG, type Catalog } from "../../src/catalog/catalog";
import { validateCatalog } from "../../src/catalog/validate-catalog";
import { FAIRGROUND_MAP } from "../../src/world/map/fairground-map";
import type { AttractionDefinition } from "../../src/world/attractions/attraction-types";
import type { DemoDefinition } from "../../src/demos/demo-types";

function fixture(): Catalog {
  return {
    attractions: structuredClone(CATALOG.attractions),
    demos: CATALOG.demos.map((demo) => ({ ...demo })),
    assets: structuredClone(CATALOG.assets),
  };
}

function changeArcade(patch: Partial<AttractionDefinition>) {
  const catalog = fixture();
  return {
    ...catalog,
    attractions: catalog.attractions.map((entry) =>
      entry.id === "arcade" ? { ...entry, ...patch } : entry,
    ),
  };
}

describe("catalog validation", () => {
  test("the production catalog validates and every structure has a presentation asset", () => {
    expect(validateCatalog(CATALOG, FAIRGROUND_MAP)).toEqual([]);
    expect(CATALOG.attractions).toHaveLength(5);
    expect(CATALOG.demos.find((demo) => demo.id === "funhouse")).toMatchObject({
      status: "coming-soon",
      attractionId: "funhouse",
    });
    expect(CATALOG.demos.find((demo) => demo.id === "zipper")).toMatchObject({
      status: "available",
      attractionId: null,
    });
  });

  test("rejects duplicate attraction, demo and asset IDs", () => {
    const catalog = fixture();
    const errors = validateCatalog(
      {
        attractions: [...catalog.attractions, catalog.attractions[0]!],
        demos: [...catalog.demos, catalog.demos[0]!],
        assets: [...catalog.assets, catalog.assets[0]!],
      },
      FAIRGROUND_MAP,
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        "Duplicate attraction id: arcade",
        "Duplicate demo id: dynamic-javascript-imports",
        "Duplicate asset key: arcade-placeholder",
      ]),
    );
  });

  test("validates loader contracts without loading any demo code", () => {
    const catalog = fixture();
    const load = vi.fn(async () => ({ mount() {} }));
    const demos = catalog.demos.map((demo) =>
      demo.status === "available" ? { ...demo, load } : demo,
    );
    expect(validateCatalog({ ...catalog, demos }, FAIRGROUND_MAP)).toEqual([]);
    expect(load).not.toHaveBeenCalled();
    expect(
      validateCatalog(
        {
          ...catalog,
          demos: demos.map((demo) => ({ ...demo, load: undefined })) as DemoDefinition[],
        },
        FAIRGROUND_MAP,
      ).join("\n"),
    ).toMatch(/Available demo is missing a loader/);
    expect(
      validateCatalog(
        {
          ...catalog,
          demos: demos.map((demo) => ({
            ...demo,
            status: "coming-soon",
          })) as unknown as DemoDefinition[],
        },
        FAIRGROUND_MAP,
      ).join("\n"),
    ).toMatch(/Nonavailable demo cannot have a loader/);
  });

  test("rejects unknown statuses and invalid rendering metadata", () => {
    expect(
      validateCatalog(
        changeArcade({ status: "typo" as AttractionDefinition["status"] }),
        FAIRGROUND_MAP,
      ).join("\n"),
    ).toMatch(/Invalid attraction status/);
    const catalog = fixture();
    expect(
      validateCatalog(
        {
          ...catalog,
          demos: catalog.demos.map((demo) => ({
            ...demo,
            status: "draft",
          })) as unknown as DemoDefinition[],
        },
        FAIRGROUND_MAP,
      ).join("\n"),
    ).toMatch(/Invalid demo status/);
    for (const placeholder of [
      { width: Infinity, height: 100, color: 0 },
      { width: 100, height: -1, color: 0 },
      { width: 100, height: 100, color: NaN },
    ]) {
      expect(
        validateCatalog(
          { ...catalog, assets: [{ key: "bad", placeholder }, ...catalog.assets] },
          FAIRGROUND_MAP,
        ).join("\n"),
      ).toMatch(/Invalid asset metadata: bad/);
    }
  });

  test("checks references in both directions, availability and missing assets", () => {
    const catalog = changeArcade({
      demoId: "missing",
      assetKey: "absent",
      highlightAssetKey: "also-absent",
    });
    expect(validateCatalog(catalog, FAIRGROUND_MAP).join("\n")).toMatch(/Missing demo.*arcade/);
    expect(validateCatalog(catalog, FAIRGROUND_MAP).join("\n")).toMatch(
      /Demo attraction reference mismatch.*dynamic-javascript-imports/,
    );
    expect(validateCatalog(catalog, FAIRGROUND_MAP).join("\n")).toMatch(/Missing asset.*absent/);
    expect(
      validateCatalog(changeArcade({ status: "unavailable" }), FAIRGROUND_MAP).join("\n"),
    ).toMatch(/Availability mismatch/);
    expect(
      validateCatalog(changeArcade({ status: "decorative" }), FAIRGROUND_MAP).join("\n"),
    ).toMatch(/Decorative attraction cannot reference a demo/);
    const missingAttraction = { ...fixture(), attractions: [] };
    expect(validateCatalog(missingAttraction, FAIRGROUND_MAP).join("\n")).toMatch(
      /Missing attraction.*arcade/,
    );
  });

  test("rejects invalid finite geometry, anchors, entrances and exits", () => {
    for (const patch of [
      { position: { x: NaN, y: 0 } },
      { sortAnchor: { x: 0, y: Infinity } },
      { interactionZone: { x: 0, y: 0, width: Infinity, height: 1 } },
      { entrancePosition: { x: 900, y: 900 } },
      { entrancePosition: { x: 360, y: 1_040 } },
      { exitAnimation: { from: { x: 360, y: 1_085 }, to: { x: 300, y: 900 }, durationMs: 450 } },
      { exitAnimation: { from: { x: 360, y: 1_085 }, to: { x: 360, y: 1_160 }, durationMs: -1 } },
    ]) {
      expect(validateCatalog(changeArcade(patch), FAIRGROUND_MAP).length).toBeGreaterThan(0);
    }
  });

  test("checks authored sprite positions using the offset ground footprint", () => {
    expect(
      validateCatalog(changeArcade({ entrancePosition: { x: 360, y: 1_061 } }), FAIRGROUND_MAP),
    ).toEqual([]);
    expect(
      validateCatalog(
        changeArcade({ entrancePosition: { x: 360, y: 1_038 } }),
        FAIRGROUND_MAP,
      ).join("\n"),
    ).toMatch(/Entrance lacks player clearance/);
    expect(
      validateCatalog(
        changeArcade({
          exitAnimation: { from: { x: 360, y: 1_085 }, to: { x: 360, y: 1_050 }, durationMs: 450 },
        }),
        FAIRGROUND_MAP,
      ).join("\n"),
    ).toMatch(/Invalid exit position/);
  });

  test("detects interaction-zone conflicts and collisions belonging to another attraction", () => {
    const catalog = fixture();
    const arcade = catalog.attractions[0]!;
    const extra: AttractionDefinition = {
      ...arcade,
      id: "overlap",
      demoId: null,
      status: "decorative" as const,
      collisionShapes: [],
    };
    // Decorative zones are not interactive; a coming-soon zone is reserved and must stay clear.
    expect(
      validateCatalog(
        { ...catalog, attractions: [...catalog.attractions, { ...extra, status: "coming-soon" }] },
        FAIRGROUND_MAP,
      ).join("\n"),
    ).toMatch(/Interaction zones overlap/);
    extra.collisionShapes = [{ type: "rectangle", ...arcade.interactionZone }];
    expect(
      validateCatalog(
        { ...catalog, attractions: [...catalog.attractions, extra] },
        FAIRGROUND_MAP,
      ).join("\n"),
    ).toMatch(/Interaction zone overlaps collision geometry.*arcade/);
  });

  test("detects an entrance disconnected from spawn by collision geometry", () => {
    const catalog = fixture();
    const wall: AttractionDefinition = {
      ...catalog.attractions[0]!,
      id: "wall",
      demoId: null,
      status: "decorative",
      position: { x: 700, y: 0 },
      collisionShapes: [
        { type: "rectangle", x: 700, y: 0, width: 40, height: FAIRGROUND_MAP.height },
      ],
    };
    expect(
      validateCatalog(
        { ...catalog, attractions: [...catalog.attractions, wall] },
        FAIRGROUND_MAP,
      ).join("\n"),
    ).toMatch(/Unreachable entrance: arcade/);
  });

  test("rejects invalid map data and bounds reachability allocations for huge maps", () => {
    expect(validateCatalog(CATALOG, { ...FAIRGROUND_MAP, width: Infinity }).join("\n")).toMatch(
      /Invalid map dimensions/,
    );
    expect(
      validateCatalog(CATALOG, { ...FAIRGROUND_MAP, spawn: { x: NaN, y: 0 } }).join("\n"),
    ).toMatch(/Invalid map spawn/);
    expect(
      validateCatalog(CATALOG, { ...FAIRGROUND_MAP, width: 1e12, height: 1e12 }),
    ).toBeInstanceOf(Array);
  });
});

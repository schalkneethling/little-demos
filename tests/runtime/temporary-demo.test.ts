import { expect, test, vi } from "vite-plus/test";
import { CATALOG } from "../../src/catalog/catalog";
import { FAIRGROUND_MAP } from "../../src/world/map/fairground-map";
import { createDirectoryEntries } from "../../src/ui/demo-directory";
import { createDemoSession } from "../../src/demos/demo-session";
import { withTemporaryDemo } from "../helpers/temporary-demo";
import { createAttractionRenderPlan } from "../../src/world/rendering/attraction-render-plan";
import { selectNearestAttraction } from "../../src/world/attractions/attraction-controller";
import { PLAYER_GROUND_OFFSET_Y } from "../../src/world/player/player-geometry";

test("temporary demos use the normal directory and lifecycle without mutating the real catalog", async () => {
  const mount = vi.fn();
  const unmount = vi.fn();
  const originalCount = CATALOG.demos.length;
  const demo = {
    id: "test-demo",
    title: "Temporary demo",
    summary: "Test only",
    category: "Tests",
    attractionId: null,
    status: "available" as const,
    load: async () => ({ mount, unmount }),
  };
  const catalog = withTemporaryDemo(CATALOG, FAIRGROUND_MAP, { demo });
  expect(CATALOG.demos).toHaveLength(originalCount);
  expect(createDirectoryEntries(catalog.demos, catalog.attractions)).toContainEqual(
    expect.objectContaining({ id: "test-demo", canOpen: true, canLocate: false }),
  );
  const session = createDemoSession({} as HTMLElement, () => {});
  expect(await session.open(demo.load)).toBe(true);
  await session.close();
  expect(mount).toHaveBeenCalledOnce();
  expect(unmount).toHaveBeenCalledOnce();
});

test("temporary registrations reject duplicate IDs without corrupting the real catalog", () => {
  expect(() => withTemporaryDemo(CATALOG, FAIRGROUND_MAP, { demo: CATALOG.demos[0]! })).toThrow(
    /Duplicate demo id/,
  );
});

test("a new attraction needs only catalog definitions for rendering, selection and directory access", () => {
  const demo = {
    id: "temporary-attraction-demo",
    title: "Temporary attraction demo",
    summary: "Fixture",
    category: "Tests",
    attractionId: "temporary-attraction",
    status: "available" as const,
    load: async () => ({ mount() {} }),
  };
  const catalog = withTemporaryDemo(CATALOG, FAIRGROUND_MAP, {
    demo,
    asset: {
      key: "temporary-placeholder",
      placeholder: { width: 100, height: 80, color: 0x123456 },
    },
    attraction: {
      id: "temporary-attraction",
      demoId: demo.id,
      name: "Temporary attraction",
      shortDescription: "Fixture",
      category: "Tests",
      status: "available",
      position: { x: 50, y: 800 },
      entrancePosition: { x: 100, y: 900 },
      interactionZone: { x: 50, y: 880, width: 100, height: 100 },
      collisionShapes: [{ type: "rectangle", x: 50, y: 800, width: 100, height: 80 }],
      assetKey: "temporary-placeholder",
      sortAnchor: { x: 100, y: 880 },
    },
  });
  const plans = createAttractionRenderPlan(
    catalog.attractions,
    new Map(catalog.assets.map((asset) => [asset.key, asset])),
  );
  expect(plans.find((plan) => plan.id === "temporary-attraction")).toMatchObject({
    interactive: true,
  });
  expect(
    selectNearestAttraction(catalog.attractions, {
      x: 100,
      y: 900 + PLAYER_GROUND_OFFSET_Y,
    })?.demoId,
  ).toBe(demo.id);
  expect(createDirectoryEntries(catalog.demos, catalog.attractions)).toContainEqual(
    expect.objectContaining({ id: demo.id, canOpen: true, canLocate: true }),
  );
  expect(CATALOG.attractions.some((attraction) => attraction.id === "temporary-attraction")).toBe(
    false,
  );
});

import { describe, expect, test } from "vite-plus/test";
import { ATTRACTIONS, getAttractionById } from "../../src/world/attractions/attraction-registry.ts";
import { validateAttractionGeometry as validateAttractionRegistry } from "../../src/catalog/validate-catalog";
import { FAIRGROUND_MAP } from "../../src/world/map/fairground-map.ts";

describe("attraction registry", () => {
  test("defines all grey-box structures in the shared registry", () => {
    expect(ATTRACTIONS).toHaveLength(5);
    expect(ATTRACTIONS[0]).toMatchObject({
      id: "arcade",
      demoId: "dynamic-javascript-imports",
      status: "available",
    });
    expect(getAttractionById("arcade")).toBe(ATTRACTIONS[0]);
    expect(getAttractionById("missing")).toBeUndefined();
  });

  test("keeps collision and interaction geometry distinct and inside the map", () => {
    expect(validateAttractionRegistry(ATTRACTIONS, FAIRGROUND_MAP)).toEqual([]);

    const arcade = ATTRACTIONS[0];
    expect(arcade.collisionShapes).not.toContain(arcade.interactionZone);
    expect(arcade.interactionZone.y).toBeGreaterThanOrEqual(
      arcade.collisionShapes[0].y + arcade.collisionShapes[0].height,
    );
  });
});

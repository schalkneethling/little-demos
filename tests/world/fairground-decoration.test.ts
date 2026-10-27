import { describe, expect, test } from "vite-plus/test";
import { isAttractionInteractive } from "../../src/world/attractions/attraction-controller";
import { ATTRACTIONS } from "../../src/world/attractions/attraction-registry";
import { FAIRGROUND_MAP } from "../../src/world/map/fairground-map";
import {
  DECORATION_PALETTE,
  PLANTER_ART_BOUNDS,
  createFairgroundDecorationPlan,
  shouldAnimateDecorations,
} from "../../src/world/rendering/fairground-decoration";

const plan = createFairgroundDecorationPlan(ATTRACTIONS);

describe("fairground decoration planning", () => {
  test("keeps the entrance sign compact, below spawn, and presentation-only", () => {
    expect(plan.entranceSign).toMatchObject({
      label: "Little Demos",
      x: FAIRGROUND_MAP.spawn.x,
      y: 1_240,
    });
    expect(plan.entranceSign.width).toBeLessThanOrEqual(220);
    expect(plan.entranceSign.y).toBeGreaterThan(FAIRGROUND_MAP.spawn.y);
    expect(plan.entranceSign.y + plan.entranceSign.height / 2).toBeLessThanOrEqual(
      FAIRGROUND_MAP.height,
    );
    expect(plan.entranceSign).not.toHaveProperty("collisionShape");
  });

  test("places two substantial planters inside every attraction footprint and off approach centers", () => {
    expect(plan.planters).toHaveLength(ATTRACTIONS.length * 2);
    for (const attraction of ATTRACTIONS) {
      const planters = plan.planters.filter((planter) => planter.attractionId === attraction.id);
      expect(planters).toHaveLength(2);
      for (const planter of planters) {
        const bounds = {
          x: planter.x - PLANTER_ART_BOUNDS.anchor.x,
          y: planter.y - PLANTER_ART_BOUNDS.anchor.y,
          width: PLANTER_ART_BOUNDS.width,
          height: PLANTER_ART_BOUNDS.height,
        };
        expect(
          attraction.collisionShapes.some(
            (shape) =>
              bounds.x >= shape.x &&
              bounds.y >= shape.y &&
              bounds.x + bounds.width <= shape.x + shape.width &&
              bounds.y + bounds.height <= shape.y + shape.height,
          ),
        ).toBe(true);
        expect(Math.abs(planter.x - attraction.entrancePosition.x)).toBeGreaterThanOrEqual(70);
      }
    }
  });

  test("uses bounded state markers without repeating attraction names", () => {
    const interactive = ATTRACTIONS.filter(isAttractionInteractive);
    expect(plan.visitedMarkers).toHaveLength(interactive.length);
    expect(plan.visitedMarkers.map(({ attractionId }) => attractionId).sort()).toEqual(
      interactive.map(({ id }) => id).sort(),
    );
    expect(plan.visitedMarkers.every((marker) => marker.symbol === "✓")).toBe(true);
    expect(plan.visitedMarkers.every((marker) => marker.label === "Visited")).toBe(true);
    expect(plan.visitedMarkers.every((marker) => marker.label.length < 12)).toBe(true);

    expect(plan.comingSoonMarkers).toEqual([
      expect.objectContaining({ attractionId: "funhouse", label: "COMING SOON" }),
    ]);
    expect(plan.comingSoonMarkers[0]!.width).toBeLessThanOrEqual(120);
  });

  test("keeps ambient motion deterministic for reduced motion and visual fixtures", () => {
    expect(plan.ambientLights.length).toBeGreaterThanOrEqual(2);
    expect(plan.ambientLights.length).toBeLessThanOrEqual(4);
    expect(shouldAnimateDecorations({ reducedMotion: false, visualFixture: false })).toBe(true);
    expect(shouldAnimateDecorations({ reducedMotion: true, visualFixture: false })).toBe(false);
    expect(shouldAnimateDecorations({ reducedMotion: false, visualFixture: true })).toBe(false);
    expect(shouldAnimateDecorations({ reducedMotion: true, visualFixture: true })).toBe(false);
    expect(DECORATION_PALETTE).toEqual({ teal: 0x31777a, coral: 0xbb4d42, cream: 0xf8f4e9 });
  });
});

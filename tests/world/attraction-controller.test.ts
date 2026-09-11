import { describe, expect, test } from "vite-plus/test";
import {
  getAttractionExitPlan,
  getAttractionSelectionChange,
  isAttractionInteractive,
  selectNearestAttraction,
} from "../../src/world/attractions/attraction-controller.ts";
import type { AttractionDefinition } from "../../src/world/attractions/attraction-types.ts";

function attraction(id: string, entranceX: number, zoneX: number): AttractionDefinition {
  return {
    id,
    demoId: `${id}-demo`,
    name: id,
    shortDescription: `${id} description`,
    category: "test",
    position: { x: zoneX, y: 0 },
    entrancePosition: { x: entranceX, y: 50 },
    interactionZone: { x: zoneX, y: 0, width: 100, height: 100 },
    collisionShapes: [],
    assetKey: id,
    status: "available",
  };
}

describe("attraction selection", () => {
  test("selects the entrance nearest the player when zones overlap", () => {
    const farther = attraction("farther", 90, 0);
    const nearer = attraction("nearer", 55, 40);

    expect(selectNearestAttraction([farther, nearer], { x: 60, y: 50 })?.id).toBe("nearer");
  });

  test("ignores unavailable attractions and points outside interaction zones", () => {
    const unavailable = { ...attraction("closed", 50, 0), status: "coming-soon" as const };

    expect(selectNearestAttraction([unavailable], { x: 50, y: 50 })).toBeNull();
    expect(selectNearestAttraction([attraction("open", 50, 0)], { x: 101, y: 50 })).toBeNull();
  });

  test("allows commands only for available attractions backed by a demo", () => {
    const available = attraction("open", 50, 0);

    expect(isAttractionInteractive(available)).toBe(true);
    expect(isAttractionInteractive({ ...available, status: "coming-soon" })).toBe(false);
    expect(isAttractionInteractive({ ...available, status: "unavailable" })).toBe(false);
    expect(isAttractionInteractive({ ...available, status: "decorative" })).toBe(false);
    expect(isAttractionInteractive({ ...available, demoId: null })).toBe(false);
    expect(isAttractionInteractive(undefined)).toBe(false);
  });

  test("completes immediately when an interactive attraction has no exit animation", () => {
    const available = attraction("open", 50, 0);
    const exitAnimation = {
      from: { x: 50, y: 50 },
      to: { x: 50, y: 80 },
      durationMs: 200,
    };

    expect(getAttractionExitPlan(available)).toEqual({ type: "immediate" });
    expect(getAttractionExitPlan({ ...available, exitAnimation })).toEqual({
      type: "animate",
      animation: exitAnimation,
    });
    expect(getAttractionExitPlan({ ...available, status: "unavailable" })).toEqual({
      type: "blocked",
    });
    expect(getAttractionExitPlan(undefined)).toEqual({ type: "blocked" });
  });

  test("emits a change only when selection changes and never activates by proximity", () => {
    expect(getAttractionSelectionChange(null, "arcade")).toEqual([
      { type: "attraction-entered", attractionId: "arcade" },
    ]);
    expect(getAttractionSelectionChange("arcade", "arcade")).toEqual([]);
    expect(getAttractionSelectionChange("arcade", null)).toEqual([
      { type: "attraction-left", attractionId: "arcade" },
    ]);
    expect(getAttractionSelectionChange("arcade", "carousel")).toEqual([
      { type: "attraction-left", attractionId: "arcade" },
      { type: "attraction-entered", attractionId: "carousel" },
    ]);
  });
});

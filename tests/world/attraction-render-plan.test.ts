import { describe, expect, test } from "vite-plus/test";
import type { AttractionDefinition } from "../../src/world/attractions/attraction-types.ts";
import {
  createAttractionRenderPlan,
  getAttractionVisualState,
} from "../../src/world/rendering/attraction-render-plan.ts";

const temporaryAttraction: AttractionDefinition = {
  id: "temporary-ride",
  demoId: "temporary-demo",
  name: "Temporary ride",
  shortDescription: "Used only to prove that rendering is definition-driven.",
  category: "test",
  position: { x: 120, y: 80 },
  entrancePosition: { x: 160, y: 190 },
  interactionZone: { x: 120, y: 170, width: 80, height: 50 },
  collisionShapes: [{ type: "rectangle", x: 130, y: 100, width: 60, height: 70 }],
  assetKey: "temporary-placeholder",
  highlightAssetKey: "temporary-placeholder-selected",
  status: "available",
  sortAnchor: { x: 175, y: 165 },
};

const assets = new Map([
  [
    "temporary-placeholder",
    { key: "temporary-placeholder", placeholder: { width: 110, height: 90, color: 0x123456 } },
  ],
  [
    "temporary-placeholder-selected",
    {
      key: "temporary-placeholder-selected",
      placeholder: { width: 110, height: 90, color: 0xabcdef },
    },
  ],
]);

describe("attraction render planning", () => {
  test("plans an arbitrary registered attraction without scene-specific knowledge", () => {
    expect(createAttractionRenderPlan([temporaryAttraction], assets)).toEqual([
      {
        id: "temporary-ride",
        center: { x: 175, y: 125 },
        size: { width: 110, height: 90 },
        baseColor: 0x123456,
        highlightColor: 0xabcdef,
        labelPosition: { x: 175, y: 125 },
        label: "Temporary ride",
        structureDepth: 165,
        labelDepth: 165.01,
        collisionShapes: temporaryAttraction.collisionShapes,
        interactionZone: temporaryAttraction.interactionZone,
        entrancePosition: temporaryAttraction.entrancePosition,
        interactive: true,
      },
    ]);
  });

  test("derives selected and visited presentation from attraction state", () => {
    const [plan] = createAttractionRenderPlan([temporaryAttraction], assets);
    expect(plan).toBeDefined();
    if (!plan) return;

    expect(
      getAttractionVisualState(plan, {
        selected: true,
        visited: true,
        highContrast: true,
      }),
    ).toEqual({
      fillColor: 0xabcdef,
      strokeColor: 0xffffff,
      strokeWidth: 9,
      label: "Temporary ride\n✓ Visited",
      showInteractionMarker: true,
    });

    expect(
      getAttractionVisualState(plan, {
        selected: true,
        visited: false,
        highContrast: false,
      }).strokeColor,
    ).toBe(0xffe269);
  });

  test("labels coming-soon definitions and keeps them non-interactive", () => {
    const comingSoon = {
      ...temporaryAttraction,
      demoId: null,
      highlightAssetKey: undefined,
      status: "coming-soon" as const,
    };
    const [plan] = createAttractionRenderPlan([comingSoon], assets);
    expect(plan).toMatchObject({
      highlightColor: 0x123456,
      label: "Temporary ride\nComing soon",
      interactive: false,
    });
  });

  test("labels unavailable definitions and keeps them non-interactive", () => {
    const unavailable = {
      ...temporaryAttraction,
      status: "unavailable" as const,
    };
    const [plan] = createAttractionRenderPlan([unavailable], assets);

    expect(plan).toMatchObject({
      label: "Temporary ride\nUnavailable",
      interactive: false,
    });
  });

  test("fails clearly when a definition references an unknown asset", () => {
    expect(() =>
      createAttractionRenderPlan(
        [{ ...temporaryAttraction, assetKey: "missing-placeholder" }],
        assets,
      ),
    ).toThrow("Missing asset for attraction temporary-ride: missing-placeholder");
  });
});

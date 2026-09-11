import type { AttractionDefinition } from "./attraction-types";

export const ATTRACTIONS = [
  {
    id: "arcade",
    demoId: "dynamic-javascript-imports",
    name: "Dynamic JavaScript Imports",
    shortDescription: "Load JavaScript features only when you need them.",
    category: "JavaScript",
    position: { x: 210, y: 870 },
    entrancePosition: { x: 360, y: 1_085 },
    interactionZone: { x: 270, y: 1_060, width: 180, height: 110 },
    collisionShapes: [{ type: "rectangle", x: 210, y: 870, width: 300, height: 190 }],
    assetKey: "arcade-placeholder",
    highlightAssetKey: "arcade-placeholder-selected",
    exitAnimation: {
      from: { x: 360, y: 1_085 },
      to: { x: 360, y: 1_160 },
      durationMs: 450,
    },
    status: "available",
    sortAnchor: { x: 360, y: 1_060 },
  },
  {
    id: "ferris-wheel",
    demoId: null,
    name: "Ferris wheel",
    shortDescription: "A landmark overlooking the fairground.",
    category: "Scenery",
    position: { x: 230, y: 190 },
    entrancePosition: { x: 355, y: 445 },
    interactionZone: { x: 295, y: 420, width: 120, height: 80 },
    collisionShapes: [{ type: "rectangle", x: 230, y: 190, width: 250, height: 230 }],
    assetKey: "ferris-wheel-placeholder",
    status: "decorative",
    sortAnchor: { x: 355, y: 420 },
  },
  {
    id: "carousel",
    demoId: null,
    name: "Carousel",
    shortDescription: "A colourful fairground landmark.",
    category: "Scenery",
    position: { x: 1_440, y: 190 },
    entrancePosition: { x: 1_565, y: 445 },
    interactionZone: { x: 1_505, y: 420, width: 120, height: 80 },
    collisionShapes: [{ type: "rectangle", x: 1_440, y: 190, width: 250, height: 230 }],
    assetKey: "carousel-placeholder",
    status: "decorative",
    sortAnchor: { x: 1_565, y: 420 },
  },
  {
    id: "funhouse",
    demoId: "funhouse",
    name: "Funhouse",
    shortDescription: "A new demo is taking shape behind the scenes.",
    category: "Experiments",
    position: { x: 1_410, y: 870 },
    entrancePosition: { x: 1_560, y: 1_085 },
    interactionZone: { x: 1_470, y: 1_060, width: 180, height: 110 },
    collisionShapes: [{ type: "rectangle", x: 1_410, y: 870, width: 300, height: 190 }],
    assetKey: "funhouse-placeholder",
    status: "coming-soon",
    sortAnchor: { x: 1_560, y: 1_060 },
  },
  {
    id: "central-plaza",
    demoId: null,
    name: "Central plaza",
    shortDescription: "The central landmark, with paths on every side.",
    category: "Scenery",
    position: { x: 785, y: 470 },
    entrancePosition: { x: 960, y: 835 },
    interactionZone: { x: 900, y: 810, width: 120, height: 60 },
    collisionShapes: [{ type: "rectangle", x: 785, y: 470, width: 350, height: 340 }],
    assetKey: "central-plaza-placeholder",
    status: "decorative",
    sortAnchor: { x: 960, y: 810 },
  },
] as const satisfies readonly AttractionDefinition[];

export const ATTRACTION_BY_ID: ReadonlyMap<string, AttractionDefinition> = new Map(
  ATTRACTIONS.map((attraction) => [attraction.id, attraction]),
);

export function getAttractionById(attractionId: string) {
  return ATTRACTION_BY_ID.get(attractionId);
}

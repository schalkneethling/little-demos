import { isAttractionInteractive } from "../attractions/attraction-controller";
import type { AttractionDefinition, WorldPoint } from "../attractions/attraction-types";

export const DECORATION_PALETTE = {
  teal: 0x31777a,
  coral: 0xbb4d42,
  cream: 0xf8f4e9,
} as const;

export const PLANTER_ART_BOUNDS = {
  width: 48,
  height: 56,
  anchor: { x: 24, y: 56 },
} as const;

interface PlanterDecoration extends WorldPoint {
  attractionId: string;
}

const PLANTER_LAYOUT: readonly PlanterDecoration[] = [
  { attractionId: "arcade", x: 234, y: 1_023 },
  { attractionId: "arcade", x: 437, y: 1_055 },
  { attractionId: "ferris-wheel", x: 254, y: 415 },
  { attractionId: "ferris-wheel", x: 456, y: 387 },
  { attractionId: "carousel", x: 1_464, y: 415 },
  { attractionId: "carousel", x: 1_666, y: 387 },
  { attractionId: "property-transition", x: 834, y: 275 },
  { attractionId: "property-transition", x: 1_086, y: 247 },
  { attractionId: "layer-cake", x: 594, y: 1_045 },
  { attractionId: "layer-cake", x: 766, y: 1_017 },
  { attractionId: "crisp-edges", x: 1_154, y: 1_045 },
  { attractionId: "crisp-edges", x: 1_326, y: 1_017 },
  { attractionId: "funhouse", x: 1_434, y: 1_055 },
  { attractionId: "funhouse", x: 1_686, y: 1_027 },
  { attractionId: "central-plaza", x: 809, y: 805 },
  { attractionId: "central-plaza", x: 1_111, y: 777 },
] as const;

const AMBIENT_LIGHTS = [
  { x: 825, y: 500, phase: 0 },
  { x: 1_095, y: 500, phase: 0.25 },
  { x: 825, y: 780, phase: 0.5 },
  { x: 1_095, y: 780, phase: 0.75 },
] as const;

export interface FairgroundDecorationPlan {
  entranceSign: WorldPoint & { width: number; height: number; label: string };
  planters: readonly PlanterDecoration[];
  visitedMarkers: readonly (WorldPoint & {
    attractionId: string;
    label: "Visited";
    symbol: "✓";
  })[];
  comingSoonMarkers: readonly (WorldPoint & {
    attractionId: string;
    width: number;
    label: "COMING SOON";
  })[];
  ambientLights: readonly (WorldPoint & { phase: number })[];
}

export function createFairgroundDecorationPlan(
  attractions: readonly AttractionDefinition[],
): FairgroundDecorationPlan {
  const ids = new Set(attractions.map(({ id }) => id));
  return {
    entranceSign: { x: 960, y: 1_240, width: 204, height: 52, label: "Little Demos" },
    planters: PLANTER_LAYOUT.filter(({ attractionId }) => ids.has(attractionId)),
    visitedMarkers: attractions.filter(isAttractionInteractive).map((attraction) => ({
      attractionId: attraction.id,
      x: attraction.interactionZone.x + attraction.interactionZone.width - 16,
      y: attraction.interactionZone.y - 12,
      label: "Visited" as const,
      symbol: "✓" as const,
    })),
    comingSoonMarkers: attractions
      .filter(({ status }) => status === "coming-soon")
      .map((attraction) => ({
        attractionId: attraction.id,
        x: attraction.collisionShapes[0]!.x + attraction.collisionShapes[0]!.width - 68,
        y: attraction.collisionShapes[0]!.y + 18,
        width: 112,
        label: "COMING SOON" as const,
      })),
    ambientLights: AMBIENT_LIGHTS,
  };
}

export function shouldAnimateDecorations(settings: {
  reducedMotion: boolean;
  visualFixture: boolean;
}): boolean {
  return !settings.reducedMotion && !settings.visualFixture;
}

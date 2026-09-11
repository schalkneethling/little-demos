import type { WorldEvent } from "../bridge/world-events";
import type { AttractionDefinition, ExitAnimationDefinition, WorldPoint } from "./attraction-types";

function containsPoint(rectangle: AttractionDefinition["interactionZone"], point: WorldPoint) {
  return (
    point.x >= rectangle.x &&
    point.x <= rectangle.x + rectangle.width &&
    point.y >= rectangle.y &&
    point.y <= rectangle.y + rectangle.height
  );
}

export function isAttractionInteractive(
  attraction: AttractionDefinition | null | undefined,
): attraction is AttractionDefinition {
  return attraction?.status === "available" && attraction.demoId !== null;
}

export type AttractionExitPlan =
  | { type: "blocked" }
  | { type: "immediate" }
  | { type: "animate"; animation: ExitAnimationDefinition };

export function getAttractionExitPlan(
  attraction: AttractionDefinition | null | undefined,
): AttractionExitPlan {
  if (!isAttractionInteractive(attraction)) return { type: "blocked" };
  if (!attraction.exitAnimation) return { type: "immediate" };
  return { type: "animate", animation: attraction.exitAnimation };
}

export function selectNearestAttraction(
  attractions: readonly AttractionDefinition[],
  playerGroundPosition: WorldPoint,
): AttractionDefinition | null {
  let selected: AttractionDefinition | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const attraction of attractions) {
    if (
      !isAttractionInteractive(attraction) ||
      !containsPoint(attraction.interactionZone, playerGroundPosition)
    ) {
      continue;
    }

    const distance = Math.hypot(
      playerGroundPosition.x - attraction.entrancePosition.x,
      playerGroundPosition.y - attraction.entrancePosition.y,
    );
    if (distance < nearestDistance) {
      selected = attraction;
      nearestDistance = distance;
    }
  }

  return selected;
}

export function getAttractionSelectionChange(
  previousAttractionId: string | null,
  nextAttractionId: string | null,
): Extract<WorldEvent, { type: "attraction-entered" | "attraction-left" }>[] {
  if (previousAttractionId === nextAttractionId) {
    return [];
  }

  const events: Extract<WorldEvent, { type: "attraction-entered" | "attraction-left" }>[] = [];
  if (previousAttractionId) {
    events.push({ type: "attraction-left", attractionId: previousAttractionId });
  }
  if (nextAttractionId) {
    events.push({ type: "attraction-entered", attractionId: nextAttractionId });
  }
  return events;
}

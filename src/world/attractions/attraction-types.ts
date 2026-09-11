import type { MapRectangle } from "../map/fairground-map";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface RectangleCollisionShape extends MapRectangle {
  type: "rectangle";
}

export type CollisionShape = RectangleCollisionShape;

export interface ExitAnimationDefinition {
  from: WorldPoint;
  to: WorldPoint;
  durationMs: number;
}

export interface AttractionDefinition {
  id: string;
  demoId: string | null;
  name: string;
  shortDescription: string;
  category: string;
  position: WorldPoint;
  entrancePosition: WorldPoint;
  interactionZone: MapRectangle;
  collisionShapes: CollisionShape[];
  assetKey: string;
  highlightAssetKey?: string;
  exitAnimation?: ExitAnimationDefinition;
  status: "available" | "coming-soon" | "unavailable" | "decorative";
  sortAnchor?: WorldPoint;
}

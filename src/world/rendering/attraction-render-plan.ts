import type {
  AttractionDefinition,
  CollisionShape,
  WorldPoint,
} from "../attractions/attraction-types";
import type { MapRectangle } from "../map/fairground-map";
import { FAIRGROUND_MAP } from "../map/fairground-map";
import { isAttractionInteractive } from "../attractions/attraction-controller";
import type { AssetDefinition } from "../assets/asset-types";

export interface AttractionRenderPlan {
  artwork?: {
    key: string;
    selectedKey?: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  id: string;
  center: WorldPoint;
  size: { width: number; height: number };
  baseColor: number;
  highlightColor: number;
  labelPosition: WorldPoint;
  label: string;
  structureDepth: number;
  labelDepth: number;
  collisionShapes: readonly CollisionShape[];
  interactionZone: MapRectangle;
  entrancePosition: WorldPoint;
  interactive: boolean;
}

export interface AttractionVisualState {
  glow?: { visible: boolean; highContrast: boolean };
  fillColor: number;
  strokeColor: number;
  strokeWidth: number;
  label: string;
  showInteractionMarker: boolean;
}

/** A narrow caption beside the approach, below the anchor, never over the art. */
export function getAttractionCaptionPosition(
  plan: AttractionRenderPlan,
  map: { width: number; height: number } = FAIRGROUND_MAP,
): WorldPoint {
  const art = plan.artwork;
  if (!art) return plan.labelPosition;
  const width = 220;
  const right = art.x + art.width + 20;
  const preferredX = right + width <= map.width - 12 ? right : art.x - width - 20;
  return {
    x: Math.max(12, Math.min(map.width - width - 12, preferredX)),
    y: Math.max(12, Math.min(map.height - 96, plan.structureDepth + 12)),
  };
}

/** Share the caption rail, clear of the player's approach and exit. */
export function getInteractionMarkerPosition(plan: AttractionRenderPlan): WorldPoint {
  if (!plan.artwork) return { x: plan.entrancePosition.x, y: plan.interactionZone.y + 32 };
  const caption = getAttractionCaptionPosition(plan);
  return { x: caption.x, y: caption.y + 60 };
}

function getAttractionLabel(attraction: AttractionDefinition) {
  switch (attraction.status) {
    case "coming-soon":
      return `${attraction.name}\nComing soon`;
    case "unavailable":
      return `${attraction.name}\nUnavailable`;
    default:
      return attraction.name;
  }
}

export function createAttractionRenderPlan(
  attractions: readonly AttractionDefinition[],
  assets: ReadonlyMap<string, AssetDefinition>,
): AttractionRenderPlan[] {
  return attractions.map((attraction) => {
    const asset = assets.get(attraction.assetKey);
    if (!asset) {
      throw new Error(`Missing asset for attraction ${attraction.id}: ${attraction.assetKey}`);
    }

    const highlightAsset = attraction.highlightAssetKey
      ? assets.get(attraction.highlightAssetKey)
      : undefined;
    const { width, height, color } = asset.placeholder;
    const center = {
      x: attraction.position.x + width / 2,
      y: attraction.position.y + height / 2,
    };
    const structureDepth =
      attraction.sortAnchor?.y ??
      attraction.presentation?.worldAnchor.y ??
      attraction.position.y + height;
    const runtime = asset.runtime;
    const anchor = runtime?.anchor;
    const placement = attraction.presentation?.worldAnchor;
    const artwork =
      runtime && anchor && placement
        ? {
            key: asset.key,
            ...(highlightAsset?.runtime ? { selectedKey: highlightAsset.key } : {}),
            x: placement.x - anchor.x,
            y: placement.y - anchor.y,
            width: runtime.width,
            height: runtime.height,
          }
        : undefined;

    return {
      ...(artwork ? { artwork } : {}),
      id: attraction.id,
      center,
      size: { width, height },
      baseColor: color,
      highlightColor: highlightAsset?.placeholder.color ?? color,
      labelPosition: center,
      label: getAttractionLabel(attraction),
      structureDepth,
      labelDepth: structureDepth + 0.01,
      collisionShapes: attraction.collisionShapes,
      interactionZone: attraction.interactionZone,
      entrancePosition: attraction.entrancePosition,
      interactive: isAttractionInteractive(attraction),
    };
  });
}

export function getAttractionVisualState(
  plan: AttractionRenderPlan,
  state: { selected: boolean; visited: boolean; highContrast: boolean; artworkReady?: boolean },
): AttractionVisualState {
  const production = Boolean(plan.artwork && state.artworkReady !== false);
  return {
    ...(production ? { glow: { visible: state.selected, highContrast: state.highContrast } } : {}),
    fillColor: state.selected ? plan.highlightColor : plan.baseColor,
    strokeColor: state.selected ? (state.highContrast ? 0xffffff : 0xffe269) : 0x25362d,
    strokeWidth: production ? 0 : state.selected ? 9 : state.visited ? 6 : 4,
    // Explicit text conveys state without a platform-dependent symbol font.
    label: state.visited ? `${plan.label}\nVisited` : plan.label,
    showInteractionMarker: plan.interactive && state.selected,
  };
}

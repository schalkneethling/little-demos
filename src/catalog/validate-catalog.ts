import type { Catalog } from "./catalog";
import { validateRuntimeAssets } from "../world/assets/validate-runtime-assets";
import type { AttractionDefinition, WorldPoint } from "../world/attractions/attraction-types";
import type { FairgroundMap, MapRectangle } from "../world/map/fairground-map";
import {
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_GROUND_OFFSET_Y,
} from "../world/player/player-geometry";

const PLAYER_HALF_WIDTH = PLAYER_BODY_WIDTH / 2;
const PLAYER_HALF_HEIGHT = PLAYER_BODY_HEIGHT / 2;

/** Spawn, entrance and exit positions are sprite centres; zones use body centres. */
function groundPoint(point: WorldPoint): WorldPoint {
  return { x: point.x, y: point.y + PLAYER_GROUND_OFFSET_Y };
}

function pointInside(point: WorldPoint, rectangle: MapRectangle) {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= rectangle.x &&
    point.x <= rectangle.x + rectangle.width &&
    point.y >= rectangle.y &&
    point.y <= rectangle.y + rectangle.height
  );
}

function bounds(map: FairgroundMap): MapRectangle {
  return { x: 0, y: 0, width: map.width, height: map.height };
}

function rectangleInside(rectangle: MapRectangle, map: FairgroundMap) {
  return (
    Number.isFinite(rectangle.width) &&
    Number.isFinite(rectangle.height) &&
    rectangle.width > 0 &&
    rectangle.height > 0 &&
    pointInside(rectangle, bounds(map)) &&
    pointInside(
      { x: rectangle.x + rectangle.width, y: rectangle.y + rectangle.height },
      bounds(map),
    )
  );
}

function overlaps(first: MapRectangle, second: MapRectangle) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function footprint(point: WorldPoint): MapRectangle {
  return {
    x: point.x - PLAYER_HALF_WIDTH,
    y: point.y - PLAYER_HALF_HEIGHT,
    width: PLAYER_HALF_WIDTH * 2,
    height: PLAYER_HALF_HEIGHT * 2,
  };
}

function duplicateErrors(values: readonly string[], label: string) {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const value of values) {
    if (!value.trim()) errors.push(`Empty ${label}`);
    if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
  return errors;
}

/**
 * Conservative authoring check, not a replacement for runtime physics/playtesting.
 * At most 128 × 128 cells are allocated, even for enormous valid map dimensions.
 * Cells are blocked if ANY part of their swept 20 × 18 player footprint touches
 * scenery or map boundaries. Four-way traversal cannot jump thin walls or cut
 * corners; narrow valid routes may therefore produce a warning. Paths are paint,
 * not a walkability whitelist: all unobstructed ground remains traversable.
 */
function reachableEntrances(
  attractions: readonly AttractionDefinition[],
  map: FairgroundMap,
  collisions: readonly MapRectangle[],
) {
  const step = Math.max(16, map.width / 128, map.height / 128);
  const columns = Math.min(128, Math.ceil(map.width / step));
  const rows = Math.min(128, Math.ceil(map.height / step));
  const count = columns * rows;
  const blocked = new Uint8Array(count);
  const visited = new Uint8Array(count);
  const queue = new Uint32Array(count);
  for (let index = 0; index < count; index++) {
    const x = (index % columns) * step;
    const y = Math.floor(index / columns) * step;
    const cell = {
      x: x - PLAYER_HALF_WIDTH,
      y: y - PLAYER_HALF_HEIGHT,
      width: Math.min(step, map.width - x) + PLAYER_HALF_WIDTH * 2,
      height: Math.min(step, map.height - y) + PLAYER_HALF_HEIGHT * 2,
    };
    blocked[index] = Number(
      !rectangleInside(cell, map) || collisions.some((shape) => overlaps(cell, shape)),
    );
  }
  function indexOf(point: WorldPoint) {
    return (
      Math.min(rows - 1, Math.floor(point.y / step)) * columns +
      Math.min(columns - 1, Math.floor(point.x / step))
    );
  }
  const start = indexOf(groundPoint(map.spawn));
  let head = 0;
  let tail = 0;
  if (!blocked[start]) {
    visited[start] = 1;
    queue[tail++] = start;
  }
  while (head < tail) {
    const index = queue[head++]!;
    const x = index % columns;
    const y = Math.floor(index / columns);
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= columns || ny < 0 || ny >= rows) continue;
      const next = ny * columns + nx;
      if (blocked[next] || visited[next]) continue;
      visited[next] = 1;
      queue[tail++] = next;
    }
  }
  return attractions
    .filter(
      (attraction) =>
        attraction.status !== "decorative" &&
        pointInside(groundPoint(attraction.entrancePosition), bounds(map)) &&
        !visited[indexOf(groundPoint(attraction.entrancePosition))],
    )
    .map((attraction) => `Unreachable entrance: ${attraction.id} (conservative grid check)`);
}

/** Geometry-only compatibility entry point; full applications should validateCatalog. */
export function validateAttractionGeometry(
  attractions: readonly AttractionDefinition[],
  map: FairgroundMap,
): string[] {
  const errors = duplicateErrors(
    attractions.map(({ id }) => id),
    "attraction id",
  );
  errors.push(
    ...duplicateErrors(
      attractions.flatMap(({ demoId }) => (demoId === null ? [] : [demoId])),
      "attraction demo id",
    ),
  );
  if (
    !Number.isFinite(map.width) ||
    !Number.isFinite(map.height) ||
    map.width <= 0 ||
    map.height <= 0
  ) {
    return [...errors, "Invalid map dimensions"];
  }
  const collisions = attractions.flatMap((attraction) => attraction.collisionShapes);
  const validCollisions = collisions.filter((shape) => rectangleInside(shape, map));
  const clearPoint = (point: WorldPoint) =>
    rectangleInside(footprint(groundPoint(point)), map) &&
    !validCollisions.some((shape) => overlaps(footprint(groundPoint(point)), shape));
  if (!pointInside(map.spawn, bounds(map)) || !clearPoint(map.spawn))
    errors.push("Invalid map spawn");
  for (const path of map.paths) {
    if (!rectangleInside(path, map)) errors.push("Invalid map path");
  }
  for (const attraction of attractions) {
    const { id } = attraction;
    if (!["available", "coming-soon", "unavailable", "decorative"].includes(attraction.status))
      errors.push(`Invalid attraction status: ${id}`);
    if (!pointInside(attraction.position, bounds(map)))
      errors.push(`Position is outside the map: ${id}`);
    if (attraction.sortAnchor && !pointInside(attraction.sortAnchor, bounds(map)))
      errors.push(`Sort anchor is outside the map: ${id}`);
    if (attraction.presentation && !pointInside(attraction.presentation.worldAnchor, bounds(map)))
      errors.push(`Presentation anchor is outside the map: ${id}`);
    if (!rectangleInside(attraction.interactionZone, map))
      errors.push(`Interaction zone is outside the map: ${id}`);
    for (const shape of attraction.collisionShapes) {
      if (shape.type !== "rectangle" || !rectangleInside(shape, map))
        errors.push(`Collision shape is outside the map: ${id}`);
    }
    if (!pointInside(attraction.entrancePosition, bounds(map)))
      errors.push(`Entrance is outside the map: ${id}`);
    if (attraction.status !== "decorative") {
      if (!pointInside(groundPoint(attraction.entrancePosition), attraction.interactionZone))
        errors.push(`Entrance is outside interaction zone: ${id}`);
      if (!clearPoint(attraction.entrancePosition))
        errors.push(`Entrance lacks player clearance: ${id}`);
      if (validCollisions.some((shape) => overlaps(shape, attraction.interactionZone)))
        errors.push(`Interaction zone overlaps collision geometry: ${id}`);
    }
    const exit = attraction.exitAnimation;
    if (exit) {
      if (!Number.isFinite(exit.durationMs) || exit.durationMs < 0)
        errors.push(`Invalid exit duration: ${id}`);
      if (
        !pointInside(groundPoint(exit.from), attraction.interactionZone) ||
        !clearPoint(exit.from) ||
        !clearPoint(exit.to)
      )
        errors.push(`Invalid exit position: ${id}`);
      // The bounding sweep is deliberately conservative for diagonal exit animations.
      const swept = {
        x: Math.min(exit.from.x, exit.to.x) - PLAYER_HALF_WIDTH,
        y: Math.min(exit.from.y, exit.to.y) + PLAYER_GROUND_OFFSET_Y - PLAYER_HALF_HEIGHT,
        width: Math.abs(exit.to.x - exit.from.x) + PLAYER_HALF_WIDTH * 2,
        height: Math.abs(exit.to.y - exit.from.y) + PLAYER_HALF_HEIGHT * 2,
      };
      if (validCollisions.some((shape) => overlaps(shape, swept)))
        errors.push(`Exit crosses collision geometry: ${id}`);
    }
  }
  const interactive = attractions.filter((attraction) => attraction.status !== "decorative");
  for (let first = 0; first < interactive.length; first++) {
    for (let second = first + 1; second < interactive.length; second++) {
      const a = interactive[first]!;
      const b = interactive[second]!;
      if (overlaps(a.interactionZone, b.interactionZone))
        errors.push(`Interaction zones overlap: ${a.id}, ${b.id}`);
    }
  }
  if (pointInside(groundPoint(map.spawn), bounds(map)))
    errors.push(...reachableEntrances(attractions, map, validCollisions));
  return errors;
}

/** Pure validation: importing this module never loads Phaser or a demo module. */
export function validateCatalog(catalog: Catalog, map: FairgroundMap): string[] {
  const { attractions, demos, assets } = catalog;
  const errors = validateAttractionGeometry(attractions, map);
  errors.push(...validateRuntimeAssets(assets));
  errors.push(
    ...duplicateErrors(
      demos.map(({ id }) => id),
      "demo id",
    ),
  );
  errors.push(
    ...duplicateErrors(
      assets.map(({ key }) => key),
      "asset key",
    ),
  );
  const demoById = new Map(demos.map((demo) => [demo.id, demo]));
  const attractionById = new Map(attractions.map((attraction) => [attraction.id, attraction]));
  const assetByKey = new Map(assets.map((asset) => [asset.key, asset]));
  for (const asset of assets) {
    const { width, height, color } = asset.placeholder;
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      !Number.isInteger(color) ||
      color < 0 ||
      color > 0xffffff
    )
      errors.push(`Invalid asset metadata: ${asset.key}`);
  }
  for (const attraction of attractions) {
    for (const key of [attraction.assetKey, attraction.highlightAssetKey]) {
      if (key !== undefined && !assetByKey.has(key))
        errors.push(`Missing asset: ${key} (${attraction.id})`);
    }
    const asset = assetByKey.get(attraction.assetKey);
    if (asset && !rectangleInside({ ...attraction.position, ...asset.placeholder }, map))
      errors.push(`Attraction asset is outside the map: ${attraction.id}`);
    if (asset?.runtime) {
      const art = asset.runtime;
      const placement = attraction.presentation?.worldAnchor;
      if (!placement || !art.anchor || art.frames || art.kind !== "transparent-raster") {
        errors.push(`Invalid attraction presentation: ${attraction.id}`);
      } else if (
        !rectangleInside(
          {
            x: placement.x - art.anchor.x,
            y: placement.y - art.anchor.y,
            width: art.width,
            height: art.height,
          },
          map,
        )
      ) {
        errors.push(`Attraction artwork is outside the map: ${attraction.id}`);
      }
      const selected = attraction.highlightAssetKey
        ? assetByKey.get(attraction.highlightAssetKey)?.runtime
        : undefined;
      if (selected && !selected.dependsOn.includes(asset.key))
        errors.push(`Highlight artwork must depend on its base: ${attraction.id}`);
      if (
        selected &&
        (selected.width !== art.width ||
          selected.height !== art.height ||
          selected.anchor?.x !== art.anchor?.x ||
          selected.anchor?.y !== art.anchor?.y ||
          selected.frames)
      ) {
        errors.push(`Incompatible highlight artwork: ${attraction.id}`);
      }
    }
    if (attraction.status === "decorative") {
      if (attraction.demoId !== null)
        errors.push(`Decorative attraction cannot reference a demo: ${attraction.id}`);
    } else {
      const demo = attraction.demoId === null ? undefined : demoById.get(attraction.demoId);
      if (!demo) errors.push(`Missing demo: ${attraction.id} (${attraction.demoId ?? "none"})`);
      else {
        if (demo.attractionId !== attraction.id)
          errors.push(`Attraction demo reference mismatch: ${attraction.id}`);
        if (demo.status !== attraction.status)
          errors.push(`Availability mismatch: ${attraction.id}`);
      }
    }
  }
  for (const demo of demos) {
    const { id } = demo;
    if (!["available", "coming-soon", "unavailable"].includes(demo.status))
      errors.push(`Invalid demo status: ${id}`);
    if (demo.status === "available" && typeof demo.load !== "function")
      errors.push(`Available demo is missing a loader: ${id}`);
    if (demo.status !== "available" && demo.load !== undefined)
      errors.push(`Nonavailable demo cannot have a loader: ${id}`);
    if (demo.attractionId !== null) {
      const attraction = attractionById.get(demo.attractionId);
      if (!attraction) errors.push(`Missing attraction: ${demo.attractionId} (${demo.id})`);
      else if (attraction.demoId !== demo.id)
        errors.push(`Demo attraction reference mismatch: ${demo.id}`);
    }
  }
  return errors;
}

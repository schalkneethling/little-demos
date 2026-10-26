import { describe, expect, test } from "vite-plus/test";
import { ATTRACTIONS } from "../../src/world/attractions/attraction-registry";
import type { AttractionDefinition } from "../../src/world/attractions/attraction-types";
import { ASSET_BY_KEY } from "../../src/world/assets/asset-registry";
import { FAIRGROUND_MAP, type MapRectangle } from "../../src/world/map/fairground-map";
import {
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_WIDTH,
  PLAYER_GROUND_OFFSET_Y,
} from "../../src/world/player/player-geometry";

const STEP = 10;
const halfWidth = PLAYER_BODY_WIDTH / 2;
const halfHeight = PLAYER_BODY_HEIGHT / 2;
const attractions: readonly AttractionDefinition[] = ATTRACTIONS;
const collisions: readonly MapRectangle[] = attractions.flatMap(
  ({ collisionShapes }) => collisionShapes,
);

function overlaps(first: MapRectangle, second: MapRectangle) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function playerFootprint(point: { x: number; y: number }): MapRectangle {
  return {
    x: point.x - halfWidth,
    y: point.y + PLAYER_GROUND_OFFSET_Y - halfHeight,
    width: PLAYER_BODY_WIDTH,
    height: PLAYER_BODY_HEIGHT,
  };
}

function clear(point: { x: number; y: number }) {
  const footprint = playerFootprint(point);
  return (
    footprint.x >= 0 &&
    footprint.y >= 0 &&
    footprint.x + footprint.width <= FAIRGROUND_MAP.width &&
    footprint.y + footprint.height <= FAIRGROUND_MAP.height &&
    !collisions.some((collision) => overlaps(footprint, collision))
  );
}

function containsPoint(rectangle: MapRectangle, point: { x: number; y: number }) {
  return (
    point.x >= rectangle.x &&
    point.x <= rectangle.x + rectangle.width &&
    point.y >= rectangle.y &&
    point.y <= rectangle.y + rectangle.height
  );
}

function reachableFromSpawn() {
  const queue = [{ ...FAIRGROUND_MAP.spawn }];
  const visited = new Set([`${FAIRGROUND_MAP.spawn.x},${FAIRGROUND_MAP.spawn.y}`]);
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index]!;
    for (const [dx, dy] of [
      [-STEP, 0],
      [STEP, 0],
      [0, -STEP],
      [0, STEP],
    ] as const) {
      const next = { x: point.x + dx, y: point.y + dy };
      const key = `${next.x},${next.y}`;
      if (visited.has(key) || !clear(next)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return queue;
}

describe("Phase 5 fairground layout", () => {
  test("keeps six full-footprint routes from spawn to the attraction entrances", () => {
    const available = attractions.filter(({ status }) => status === "available");
    expect(available).toHaveLength(6);
    const reachable = reachableFromSpawn();
    for (const attraction of available) {
      expect(clear(attraction.entrancePosition), attraction.id).toBe(true);
      expect(
        reachable.some(
          ({ x, y }) =>
            Math.abs(x - attraction.entrancePosition.x) <= STEP &&
            Math.abs(y - attraction.entrancePosition.y) <= STEP,
        ),
        attraction.id,
      ).toBe(true);
      expect(
        FAIRGROUND_MAP.paths.some((path) =>
          containsPoint(path, {
            x: attraction.entrancePosition.x,
            y: attraction.entrancePosition.y + PLAYER_GROUND_OFFSET_Y,
          }),
        ),
        `${attraction.id} path apron`,
      ).toBe(true);
    }
  });

  test("keeps reserved interaction zones separate", () => {
    const reserved = attractions.filter(({ status }) => status !== "decorative");
    for (let first = 0; first < reserved.length; first++) {
      for (let second = first + 1; second < reserved.length; second++) {
        expect(
          overlaps(reserved[first]!.interactionZone, reserved[second]!.interactionZone),
          `${reserved[first]!.id}, ${reserved[second]!.id}`,
        ).toBe(false);
      }
    }
  });

  test("keeps exit destinations clear and outside their activation zones", () => {
    for (const attraction of attractions.filter(({ status }) => status === "available")) {
      expect(attraction.exitAnimation, attraction.id).toBeDefined();
      const exit = attraction.exitAnimation!;
      expect(clear(exit.from), `${attraction.id} exit start`).toBe(true);
      expect(clear(exit.to), `${attraction.id} exit destination`).toBe(true);
      expect(
        containsPoint(attraction.interactionZone, {
          x: exit.to.x,
          y: exit.to.y + PLAYER_GROUND_OFFSET_Y,
        }),
        `${attraction.id} exit destination`,
      ).toBe(false);
    }
  });

  test("keeps placeholder and runtime artwork inside the world independently of collision", () => {
    for (const attraction of attractions) {
      const asset = ASSET_BY_KEY.get(attraction.assetKey)!;
      const art = asset.runtime;
      const anchor = art?.anchor;
      const placement = attraction.presentation?.worldAnchor;
      const envelope =
        art && anchor && placement
          ? {
              x: placement.x - anchor.x,
              y: placement.y - anchor.y,
              width: art.width,
              height: art.height,
            }
          : { ...attraction.position, ...asset.placeholder };
      expect(envelope.x, `${attraction.id} left`).toBeGreaterThanOrEqual(0);
      expect(envelope.y, `${attraction.id} top`).toBeGreaterThanOrEqual(0);
      expect(envelope.x + envelope.width, `${attraction.id} right`).toBeLessThanOrEqual(
        FAIRGROUND_MAP.width,
      );
      expect(envelope.y + envelope.height, `${attraction.id} bottom`).toBeLessThanOrEqual(
        FAIRGROUND_MAP.height,
      );
    }
    for (const id of ["property-transition", "layer-cake", "crisp-edges"]) {
      const attraction = attractions.find((entry) => entry.id === id)!;
      const asset = ASSET_BY_KEY.get(attraction.assetKey)!;
      const art = asset.runtime!;
      const placement = attraction.presentation!.worldAnchor;
      expect(attraction.collisionShapes).not.toEqual([
        {
          type: "rectangle",
          x: placement.x - art.anchor!.x,
          y: placement.y - art.anchor!.y,
          width: art.width,
          height: art.height,
        },
      ]);
    }
  });

  test("does not paint paths through solid collision geometry", () => {
    for (const path of FAIRGROUND_MAP.paths) {
      for (const collision of collisions) {
        expect(overlaps(path, collision), JSON.stringify(path)).toBe(false);
      }
    }
  });
});

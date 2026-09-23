import { describe, expect, test } from "vite-plus/test";
import {
  SPATIAL_PREVIEW,
  containsPoint,
  footprintClear,
  pointOnPath,
} from "../../src/world/prototype/layout";

describe("spatial approval preview", () => {
  test("authors a fixed, spacious world and a south arrival", () => {
    expect(SPATIAL_PREVIEW.width).toBe(3_200);
    expect(SPATIAL_PREVIEW.height).toBe(2_400);
    expect(SPATIAL_PREVIEW.spawn.y).toBeGreaterThan(1_900);
    expect(pointOnPath(SPATIAL_PREVIEW.spawn)).toBe(true);
  });

  test("keeps all six demo associations and the unfinished plot", () => {
    const available = SPATIAL_PREVIEW.plots.filter((plot) => plot.status === "available");
    expect(available.map((plot) => plot.id).sort()).toEqual([
      "arcade",
      "carousel",
      "crisp-edges",
      "ferris-wheel",
      "layer-cake",
      "property-transition",
    ]);
    expect(new Set(available.map((plot) => plot.demoId)).size).toBe(6);
    expect(SPATIAL_PREVIEW.plots.find((plot) => plot.id === "funhouse")?.status).toBe(
      "coming-soon",
    );
  });

  test("gives each plot a clear path-side approach and exit", () => {
    for (const plot of SPATIAL_PREVIEW.plots) {
      expect(footprintClear(plot.approach), `${plot.id} approach`).toBe(true);
      expect(footprintClear(plot.exit), `${plot.id} exit`).toBe(true);
      expect(pointOnPath(plot.approach), `${plot.id} approach path`).toBe(true);
      expect(pointOnPath(plot.exit), `${plot.id} exit path`).toBe(true);
      expect(containsPoint(plot.footprint, plot.exit), `${plot.id} exit clearance`).toBe(false);
    }
  });

  test("keeps circulation continuous to every stop with a player-sized footprint", () => {
    const step = 20;
    const key = (x: number, y: number) => `${x},${y}`;
    const start = {
      x: Math.round(SPATIAL_PREVIEW.spawn.x / step) * step,
      y: Math.round(SPATIAL_PREVIEW.spawn.y / step) * step,
    };
    const queue = [start];
    const seen = new Set([key(start.x, start.y)]);
    for (let index = 0; index < queue.length; index++) {
      const { x, y } = queue[index]!;
      for (const [dx, dy] of [
        [-step, 0],
        [step, 0],
        [0, -step],
        [0, step],
      ] as const) {
        const next = { x: x + dx, y: y + dy };
        const id = key(next.x, next.y);
        if (seen.has(id) || !pointOnPath(next) || !footprintClear(next)) continue;
        seen.add(id);
        queue.push(next);
      }
    }
    for (const plot of SPATIAL_PREVIEW.plots) {
      expect(
        queue.some(
          (point) =>
            Math.abs(point.x - plot.approach.x) <= step &&
            Math.abs(point.y - plot.approach.y) <= step,
        ),
        `${plot.id} route`,
      ).toBe(true);
    }
  });

  test("grounds planting beside the fountain without blocking circulation", () => {
    for (const planter of SPATIAL_PREVIEW.planters) {
      expect(footprintClear(planter), `planter ${planter.x},${planter.y}`).toBe(true);
      expect(planter.x).toBeGreaterThan(0);
      expect(planter.x).toBeLessThan(SPATIAL_PREVIEW.width);
      expect(planter.y).toBeGreaterThan(0);
      expect(planter.y).toBeLessThan(SPATIAL_PREVIEW.height);
    }
  });
});

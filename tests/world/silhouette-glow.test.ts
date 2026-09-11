import { describe, expect, test, vi } from "vite-plus/test";
import type Phaser from "phaser";
import {
  createSilhouetteGlow,
  GLOW_PADDING,
  paintSilhouetteGlow,
} from "../../src/world/rendering/silhouette-glow";

describe("static alpha-shaped production glow", () => {
  test.each([false, true])(
    "composites only source alpha and removes the solid center (high contrast %s)",
    (highContrast) => {
      const operations: unknown[][] = [];
      function context(name: string) {
        const target = {
          canvas: {} as HTMLCanvasElement,
          globalCompositeOperation: "source-over",
          shadowColor: "transparent",
          shadowBlur: 0,
          fillStyle: "",
          clearRect: vi.fn(),
          drawImage: (...args: unknown[]) =>
            operations.push([
              name,
              "draw",
              target.globalCompositeOperation,
              target.shadowBlur,
              ...args,
            ]),
          fillRect: (...args: unknown[]) =>
            operations.push([
              name,
              "fill",
              target.globalCompositeOperation,
              target.fillStyle,
              ...args,
            ]),
        };
        return target as unknown as CanvasRenderingContext2D;
      }
      const output = context("output");
      const mask = context("mask");
      const source = {} as HTMLImageElement;
      paintSilhouetteGlow(output, mask, source, 320, 310, highContrast);
      expect(operations).toEqual([
        ["mask", "draw", "source-over", 0, source, GLOW_PADDING, GLOW_PADDING, 320, 310],
        ["mask", "fill", "source-in", highContrast ? "#ffffff" : "#ffdf88", 0, 0, 368, 358],
        ["output", "draw", "source-over", highContrast ? 10 : 14, mask.canvas, 0, 0],
        ["output", "draw", "destination-out", 0, mask.canvas, 0, 0],
      ]);
      expect(output.globalCompositeOperation).toBe("source-over");
      expect(output.shadowBlur).toBe(0);
      expect(mask.globalCompositeOperation).toBe("source-over");
    },
  );

  test("rejects oversized or nonfinite effect dimensions before requesting a source or allocating canvas", () => {
    const textures = { get: vi.fn() };
    for (const width of [0, -1, 1025, Infinity, NaN, 320.5]) {
      expect(
        createSilhouetteGlow(textures as unknown as Phaser.Textures.TextureManager, {
          key: "arcade",
          x: 200,
          y: 750,
          width,
          height: 310,
        }),
      ).toBeNull();
    }
    expect(textures.get).not.toHaveBeenCalled();
  });
});

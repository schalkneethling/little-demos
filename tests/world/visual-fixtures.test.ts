import { describe, expect, test } from "vite-plus/test";
import { getVisualFixture } from "../../src/world/rendering/visual-fixtures";

describe("debug-only visual fixture whitelist", () => {
  test.each([
    ["arcade", 360, 1120, false],
    ["arcade-behind", 360, 820, false],
    ["arcade-west", 185, 940, false],
    ["arcade-east", 535, 940, false],
    ["arcade-exit", 360, 1160, true],
  ] as const)("pins %s to an authored player position and shared camera", (name, x, y, visited) => {
    expect(getVisualFixture(true, name)).toEqual({
      player: { x, y },
      camera: { x: 360, y: 980, zoom: 1 },
      visited,
    });
  });
  test("does not enable fixtures without debug or accept arbitrary query input", () => {
    for (const name of [null, "", "constructor", "__proto__", "arcade?x=50", "360,1120"])
      expect(getVisualFixture(true, name)).toBeUndefined();
    expect(getVisualFixture(false, "arcade")).toBeUndefined();
  });
});

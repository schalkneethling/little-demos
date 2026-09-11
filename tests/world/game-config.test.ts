import { describe, expect, test } from "vite-plus/test";
import { ARCADE_PHYSICS_CONFIG } from "../../src/world/config.ts";

describe("world physics configuration", () => {
  test("integrates velocity using elapsed frame time when rendering is below 60 FPS", () => {
    expect(ARCADE_PHYSICS_CONFIG.fixedStep).toBe(false);
  });
});

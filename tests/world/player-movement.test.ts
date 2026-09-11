import { describe, expect, test } from "vite-plus/test";
import { getMovementIntent, getMovementVelocity } from "../../src/world/player/player-movement.ts";

describe("player movement", () => {
  test("supports arrows and WASD in the default movement scheme", () => {
    expect(getMovementIntent(new Set(["ArrowLeft", "KeyW"]), "arrows-and-wasd")).toEqual({
      x: -1,
      y: -1,
    });
  });

  test("respects restricted movement schemes", () => {
    expect(getMovementIntent(new Set(["ArrowRight", "KeyA"]), "arrows-only")).toEqual({
      x: 1,
      y: 0,
    });
    expect(getMovementIntent(new Set(["ArrowRight", "KeyA"]), "wasd-only")).toEqual({
      x: -1,
      y: 0,
    });
  });

  test("normalizes diagonal velocity to the configured speed", () => {
    const velocity = getMovementVelocity({ x: 1, y: 1 }, 180);

    expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(180);
    expect(velocity.x).toBeCloseTo(180 / Math.sqrt(2));
    expect(velocity.y).toBeCloseTo(180 / Math.sqrt(2));
  });

  test("returns no velocity when controls are inactive", () => {
    expect(getMovementVelocity({ x: 1, y: 0 }, 180, false)).toEqual({
      x: 0,
      y: 0,
    });
  });
});

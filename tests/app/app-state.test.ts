import { describe, expect, test } from "vite-plus/test";
import { createInitialAppState, reduceAppState } from "../../src/app/app-state.ts";

describe("application state", () => {
  test("starts as an ordinary document with motion preference inherited", () => {
    const state = createInitialAppState(true);

    expect(state.mode).toBe("document");
    expect(state.worldReady).toBe(false);
    expect(state.settings.reducedMotion).toBe(true);
    expect(state.settings.movementScheme).toBe("arrows-and-wasd");
  });

  test("moves deliberately into exploration and can pause and resume", () => {
    const ready = reduceAppState(createInitialAppState(false), {
      type: "world-ready",
    });
    const exploring = reduceAppState(ready, { type: "exploration-started" });
    const paused = reduceAppState(exploring, { type: "world-paused" });
    const resumed = reduceAppState(paused, { type: "world-resumed" });

    expect(exploring.mode).toBe("exploring");
    expect(paused.mode).toBe("paused");
    expect(resumed.mode).toBe("exploring");
  });

  test("does not enter exploration before the world reports ready", () => {
    const state = reduceAppState(createInitialAppState(false), {
      type: "exploration-started",
    });

    expect(state.mode).toBe("document");
  });

  test("records meaningful player positions without mutating prior state", () => {
    const initial = createInitialAppState(false);
    const moved = reduceAppState(initial, {
      type: "player-position-changed",
      x: 128,
      y: 256,
    });

    expect(initial.lastPlayerPosition).toBeNull();
    expect(moved.lastPlayerPosition).toEqual({ x: 128, y: 256 });
  });
});

import { describe, expect, test, vi } from "vite-plus/test";
import { createExitTransition } from "../../src/world/player/exit-transition";

describe("attraction exit transition", () => {
  test("settles at the safe exit exactly once even if a queued completion follows", () => {
    const stop = vi.fn();
    const complete = vi.fn();
    const transition = createExitTransition(stop, complete);
    transition.finish();
    transition.finish();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  test("shutdown cancels movement without announcing an exit later", () => {
    const stop = vi.fn();
    const complete = vi.fn();
    const transition = createExitTransition(stop, complete);
    transition.cancel();
    transition.finish();
    transition.cancel();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
  });
});

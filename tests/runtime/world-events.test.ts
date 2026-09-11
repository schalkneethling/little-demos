import { describe, expect, test, vi } from "vite-plus/test";
import { createWorldBridge } from "../../src/world/bridge/world-events.ts";

describe("world event bridge", () => {
  test("keeps world events and application commands on separate channels", () => {
    const bridge = createWorldBridge();
    const eventListener = vi.fn();
    const commandListener = vi.fn();
    bridge.onEvent(eventListener);
    bridge.onCommand(commandListener);

    bridge.emit({ type: "world-ready" });
    bridge.emit({ type: "attraction-entered", attractionId: "arcade" });
    bridge.emit({ type: "attraction-activated", attractionId: "arcade" });
    bridge.emit({ type: "world-diagnostics", x: 20, y: 30, fps: 60 });
    bridge.command({ type: "play-attraction-exit", attractionId: "arcade" });

    expect(eventListener).toHaveBeenNthCalledWith(1, { type: "world-ready" });
    expect(eventListener).toHaveBeenNthCalledWith(2, {
      type: "attraction-entered",
      attractionId: "arcade",
    });
    expect(eventListener).toHaveBeenNthCalledWith(3, {
      type: "attraction-activated",
      attractionId: "arcade",
    });
    expect(eventListener).toHaveBeenNthCalledWith(4, {
      type: "world-diagnostics",
      x: 20,
      y: 30,
      fps: 60,
    });
    expect(eventListener).toHaveBeenCalledTimes(4);
    expect(commandListener).toHaveBeenCalledWith({
      type: "play-attraction-exit",
      attractionId: "arcade",
    });
    expect(commandListener).toHaveBeenCalledTimes(1);
  });

  test("unsubscribe removes a listener without affecting others", () => {
    const bridge = createWorldBridge();
    const removedListener = vi.fn();
    const activeListener = vi.fn();
    const unsubscribe = bridge.onEvent(removedListener);
    bridge.onEvent(activeListener);

    unsubscribe();
    bridge.emit({ type: "world-ready" });

    expect(removedListener).not.toHaveBeenCalled();
    expect(activeListener).toHaveBeenCalledOnce();
  });
});

import { describe, expect, test, vi } from "vite-plus/test";
import { createRuntimeManager } from "../../src/world/runtime-manager.ts";

describe("world runtime manager", () => {
  test("mounts once and destroys the mounted runtime once", async () => {
    const destroy = vi.fn();
    const start = vi.fn(async () => ({ destroy }));
    const manager = createRuntimeManager(start);

    const firstMount = manager.mount();
    const secondMount = manager.mount();
    await Promise.all([firstMount, secondMount]);
    manager.unmount();
    manager.unmount();

    expect(start).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  test("destroys a runtime that finishes mounting after unmount", async () => {
    const destroy = vi.fn();
    let finishMount: ((runtime: { destroy(): void }) => void) | undefined;
    const manager = createRuntimeManager(
      () =>
        new Promise((resolve) => {
          finishMount = resolve;
        }),
    );

    const mounting = manager.mount();
    manager.unmount();
    finishMount?.({ destroy });
    await mounting;

    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

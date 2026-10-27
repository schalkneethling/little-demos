import { describe, expect, test, vi } from "vite-plus/test";
import { createDemoSession } from "../../src/demos/demo-session";
import { DemoImportError } from "../../src/demos/demo-import-error";
import type { DemoModule } from "../../src/demos/demo-types";

describe("demo session lifecycle", () => {
  test("distinguishes rejected imports from failed mounts for browser retry", async () => {
    const session = createDemoSession({} as HTMLElement, () => {});
    await expect(
      session.open(async () => {
        throw new TypeError("Network error");
      }),
    ).rejects.toBeInstanceOf(DemoImportError);
    await expect(
      session.open(async () => ({
        mount: () => {
          throw new Error("Mount failed");
        },
      })),
    ).rejects.not.toBeInstanceOf(DemoImportError);
  });
  test("closing a pending import prevents mounting", async () => {
    let resolve!: (value: DemoModule) => void;
    const mount = vi.fn();
    const session = createDemoSession({} as HTMLElement, () => {});
    let start!: () => void;
    const started = new Promise<void>((done) => {
      start = done;
    });
    const loading = session.open(
      () =>
        new Promise((done) => {
          resolve = done;
          start();
        }),
    );
    await started;
    await session.close();
    resolve({ mount });
    expect(await loading).toBe(false);
    expect(mount).not.toHaveBeenCalled();
  });

  test("closing immediately cancels before import starts", async () => {
    const load = vi.fn(async () => ({ mount: () => {} }));
    const session = createDemoSession({} as HTMLElement, () => {});
    const loading = session.open(load);
    await session.close();
    expect(await loading).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  test("aborts context before unmounting and cleans up exactly once", async () => {
    let signal!: AbortSignal;
    const unmount = vi.fn(() => {
      expect(signal.aborted).toBe(true);
    });
    const session = createDemoSession({} as HTMLElement, () => {});
    await session.open(async () => ({
      mount: (_container, context) => {
        signal = context.signal;
      },
      unmount,
    }));
    await session.close();
    await session.close();
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  test("failed mounts are cleaned up and can be retried", async () => {
    const unmount = vi.fn();
    const session = createDemoSession({} as HTMLElement, () => {});
    await expect(
      session.open(async () => ({
        mount: () => {
          throw new Error("Mount failed");
        },
        unmount,
      })),
    ).rejects.toThrow("Mount failed");
    expect(unmount).toHaveBeenCalledTimes(1);
    expect(await session.open(async () => ({ mount: () => {} }))).toBe(true);
  });

  test("aborts an in-progress mount and ignores its late completion", async () => {
    let finishMount!: () => void;
    let started!: () => void;
    const mounting = new Promise<void>((resolve) => {
      started = resolve;
    });
    let signal!: AbortSignal;
    const unmount = vi.fn();
    const session = createDemoSession({} as HTMLElement, () => {});
    const loading = session.open(async () => ({
      mount: (_container, context) => {
        signal = context.signal;
        started();
        return new Promise<void>((resolve) => {
          finishMount = resolve;
        });
      },
      unmount,
    }));
    await mounting;
    await session.close();
    expect(signal.aborted).toBe(true);
    expect(unmount).toHaveBeenCalledTimes(1);
    finishMount();
    expect(await loading).toBe(false);
  });

  test("uses the latest motion value when an asynchronous import mounts", async () => {
    let resolve!: (value: DemoModule) => void;
    let markStarted!: () => void;
    const started = new Promise<void>((done) => {
      markStarted = done;
    });
    let contextReducedMotion: boolean | undefined;
    const session = createDemoSession({} as HTMLElement, () => {});
    const loading = session.open(
      () =>
        new Promise((done) => {
          resolve = done;
          markStarted();
        }),
    );
    await started;
    session.setReducedMotion(true);
    resolve({
      mount: (_container, context) => {
        contextReducedMotion = context.reducedMotion;
      },
    });
    expect(await loading).toBe(true);
    expect(contextReducedMotion).toBe(true);
  });

  test("notifies a mounted demo without remounting and removes subscribers on close", async () => {
    const changes: boolean[] = [];
    const mount = vi.fn((_container: HTMLElement, context: Parameters<DemoModule["mount"]>[1]) => {
      context.onReducedMotionChange((reducedMotion) => changes.push(reducedMotion));
    });
    const session = createDemoSession({} as HTMLElement, () => {});
    await session.open(async () => ({ mount }));

    session.setReducedMotion(true);
    session.setReducedMotion(false);
    expect(changes).toEqual([false, true, false]);
    expect(mount).toHaveBeenCalledTimes(1);

    await session.close();
    session.setReducedMotion(true);
    expect(changes).toEqual([false, true, false]);
  });

  test("delivers a motion change that happens before an async mount subscribes", async () => {
    let continueMount!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((done) => {
      markStarted = done;
    });
    const changes: boolean[] = [];
    const session = createDemoSession({} as HTMLElement, () => {});
    const loading = session.open(async () => ({
      async mount(_container, context) {
        markStarted();
        await new Promise<void>((done) => {
          continueMount = done;
        });
        context.onReducedMotionChange((reducedMotion) => changes.push(reducedMotion));
      },
    }));
    await started;
    session.setReducedMotion(true);
    continueMount();

    expect(await loading).toBe(true);
    expect(changes).toEqual([true]);
  });
});

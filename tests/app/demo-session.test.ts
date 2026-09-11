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
});

import { describe, expect, test } from "vite-plus/test";
import {
  clearMotionOverride,
  readMotionOverride,
  writeMotionOverride,
} from "../../src/app/motion-preference";

describe("explicit motion preference", () => {
  test("restores explicit reduction while legacy false follows the system", () => {
    expect(readMotionOverride({ getItem: () => '{"version":1,"reducedMotion":true}' })).toBe(true);
    expect(readMotionOverride({ getItem: () => '{"version":1,"reducedMotion":false}' })).toBeNull();
    for (const value of [
      null,
      "invalid",
      '{"version":2,"reducedMotion":true}',
      '{"version":1,"reducedMotion":"true"}',
      "x".repeat(500),
    ]) {
      expect(readMotionOverride({ getItem: () => value })).toBeNull();
    }
  });
  test("persists and clears the explicit override while tolerating denied storage", () => {
    let stored = "";
    writeMotionOverride({
      setItem: (_key, value) => {
        stored = value;
      },
    });
    expect(readMotionOverride({ getItem: () => stored })).toBe(true);
    let removed = "";
    clearMotionOverride({
      removeItem: (key) => {
        removed = key;
      },
    });
    expect(removed).toBe("little-demos:motion");
    expect(
      readMotionOverride({
        getItem: () => {
          throw new Error("Denied");
        },
      }),
    ).toBeNull();
    expect(() =>
      writeMotionOverride({
        setItem: () => {
          throw new Error("Denied");
        },
      }),
    ).not.toThrow();
    expect(() =>
      clearMotionOverride({
        removeItem: () => {
          throw new Error("Denied");
        },
      }),
    ).not.toThrow();
  });
});

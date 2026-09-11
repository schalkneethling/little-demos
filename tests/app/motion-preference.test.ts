import { describe, expect, test } from "vite-plus/test";
import { readMotionOverride, writeMotionOverride } from "../../src/app/motion-preference";

describe("explicit motion preference", () => {
  test("restores explicit true and false while rejecting malformed data", () => {
    expect(readMotionOverride({ getItem: () => '{"version":1,"reducedMotion":true}' })).toBe(true);
    expect(readMotionOverride({ getItem: () => '{"version":1,"reducedMotion":false}' })).toBe(
      false,
    );
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
  test("persists the explicit override and tolerates denied storage", () => {
    let stored = "";
    writeMotionOverride(
      {
        setItem: (_key, value) => {
          stored = value;
        },
      },
      false,
    );
    expect(readMotionOverride({ getItem: () => stored })).toBe(false);
    expect(
      readMotionOverride({
        getItem: () => {
          throw new Error("Denied");
        },
      }),
    ).toBeNull();
    expect(() =>
      writeMotionOverride(
        {
          setItem: () => {
            throw new Error("Denied");
          },
        },
        true,
      ),
    ).not.toThrow();
  });
});

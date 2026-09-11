import { describe, expect, test } from "vite-plus/test";
import {
  getCameraFollowLerp,
  getVoidSafeCameraZoom,
} from "../../src/world/systems/camera-system.ts";

describe("void-safe camera zoom", () => {
  test("uses natural scale while the map covers the viewport", () => {
    expect(getVoidSafeCameraZoom(1_920, 1_280, 1_440, 900)).toBe(1);
  });

  test("zooms in when either viewport dimension exceeds the map", () => {
    expect(getVoidSafeCameraZoom(1_920, 1_280, 2_560, 1_440)).toBeCloseTo(4 / 3);
    expect(getVoidSafeCameraZoom(1_920, 1_280, 1_500, 1_600)).toBeCloseTo(1.25);
  });

  test("falls back safely for unavailable dimensions", () => {
    expect(getVoidSafeCameraZoom(0, 1_280, 1_440, 900)).toBe(1);
    expect(getVoidSafeCameraZoom(1_920, 1_280, 0, 0)).toBe(1);
  });
});

describe("camera motion", () => {
  test("removes follow easing when reduced motion is enabled", () => {
    expect(getCameraFollowLerp(false)).toBeLessThan(1);
    expect(getCameraFollowLerp(true)).toBe(1);
  });
});

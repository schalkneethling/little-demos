import { expect, test } from "vite-plus/test";
import { clampCameraZoom, wheelCameraAction } from "../../src/world/systems/camera-navigation";

test("camera zoom permits an overview but never exposes outside-world voids", () => {
  expect(clampCameraZoom(0.1, 1920, 1280, 960, 640)).toBe(0.5);
  expect(clampCameraZoom(20, 1920, 1280, 960, 640)).toBe(4);
  expect(clampCameraZoom(0.5, 1920, 1280, 2560, 1440)).toBeCloseTo(4 / 3);
});

test("wheel input normalizes units, supports zoom, and preserves browser magnification", () => {
  const wheel = {
    deltaX: 2,
    deltaY: 3,
    deltaMode: 1,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  };
  expect(wheelCameraAction(wheel, 800)).toEqual({ type: "camera-pan", x: 32, y: 48 });
  expect(wheelCameraAction({ ...wheel, ctrlKey: true }, 800)).toBeNull();
  expect(wheelCameraAction({ ...wheel, metaKey: true }, 800)).toBeNull();
  expect(wheelCameraAction({ ...wheel, altKey: true }, 800)?.type).toBe("camera-zoom");
});

import type { WorldCommand } from "../bridge/world-events";

export function clampCameraZoom(
  zoom: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  const minimum = Math.max(viewportWidth / width, viewportHeight / height);
  return Math.max(minimum, Math.min(Math.max(4, minimum), zoom));
}

export function wheelCameraAction(
  event: Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode" | "altKey" | "ctrlKey" | "metaKey">,
  height: number,
): WorldCommand | null {
  // Trackpad pinch is commonly emitted as Ctrl+wheel. Keep native browser zoom.
  if (event.ctrlKey || event.metaKey) return null;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
  const x = Math.max(-600, Math.min(600, event.deltaX * unit));
  const y = Math.max(-600, Math.min(600, event.deltaY * unit));
  return event.altKey
    ? { type: "camera-zoom", factor: Math.exp(-y * 0.002) }
    : { type: "camera-pan", x, y };
}

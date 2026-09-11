import type { WorldBridge, WorldCommand } from "../world/bridge/world-events";
import { wheelCameraAction } from "../world/systems/camera-navigation";

export function createCameraControls(
  world: HTMLElement,
  bridge: WorldBridge,
  available: () => boolean,
) {
  const panel = document.querySelector<HTMLDetailsElement>("[data-camera-controls]")!;
  const status = panel.querySelector<HTMLElement>("[data-camera-status]")!;
  const zoom = panel.querySelector<HTMLOutputElement>("[data-camera-zoom]")!;
  const listeners = new AbortController();
  const { signal } = listeners;
  let drag: { id: number; x: number; y: number; moved: boolean } | undefined;
  const send = (command: WorldCommand) => {
    if (!available()) return;
    // A gesture stops player movement without stealing focus from DOM controls.
    if (document.activeElement === world) world.blur();
    bridge.command(command);
  };
  world.addEventListener(
    "wheel",
    (event) => {
      if (!available()) return;
      const command = wheelCameraAction(event, world.clientHeight);
      if (!command) return;
      event.preventDefault();
      send(command);
    },
    { passive: false, signal },
  );
  world.addEventListener(
    "pointerdown",
    (event) => {
      if (
        !available() ||
        event.pointerType === "touch" ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      event.preventDefault();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      world.setPointerCapture(event.pointerId);
      world.dataset.dragging = "true";
    },
    { signal },
  );
  world.addEventListener(
    "pointermove",
    (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      if (event.clientX === drag.x && event.clientY === drag.y) return;
      drag.moved = true;
      send({ type: "camera-pan", x: drag.x - event.clientX, y: drag.y - event.clientY });
      drag.x = event.clientX;
      drag.y = event.clientY;
    },
    { signal },
  );
  const release = () => {
    if (drag && world.hasPointerCapture(drag.id)) world.releasePointerCapture(drag.id);
    drag = undefined;
    delete world.dataset.dragging;
  };
  world.addEventListener(
    "pointerup",
    () => {
      const clicked = drag && !drag.moved;
      release();
      if (clicked && available()) world.focus({ preventScroll: true });
    },
    { signal },
  );
  for (const name of ["pointercancel", "lostpointercapture"])
    world.addEventListener(name, release, { signal });
  window.addEventListener("blur", release, { signal });
  const actions: Record<string, WorldCommand> = {
    left: { type: "camera-pan", x: -160, y: 0 },
    right: { type: "camera-pan", x: 160, y: 0 },
    up: { type: "camera-pan", x: 0, y: -160 },
    down: { type: "camera-pan", x: 0, y: 160 },
    in: { type: "camera-zoom", factor: 1.2 },
    out: { type: "camera-zoom", factor: 1 / 1.2 },
    return: { type: "camera-return" },
  };
  panel.addEventListener(
    "click",
    (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-camera-action]")
          : null;
      const command = actions[button?.dataset.cameraAction ?? ""];
      if (command) send(command);
    },
    { signal },
  );
  const stop = bridge.onEvent((event) => {
    if (event.type === "world-ready" || event.type === "world-error") {
      panel.querySelectorAll("button").forEach((button) => {
        button.disabled = event.type !== "world-ready";
      });
    }
    if (event.type !== "camera-changed") return;
    zoom.value = `${Math.round(event.zoom * 100)}%`;
    panel.dataset.cameraX = String(event.x);
    panel.dataset.cameraY = String(event.y);
    panel.dataset.zoom = String(event.zoom);
    const message = event.manual
      ? "Looking around. Return to player or move with the keyboard to follow again."
      : "Following player.";
    if (status.textContent !== message) status.textContent = message;
  });
  return () => {
    release();
    listeners.abort();
    stop();
  };
}

import { createInitialAppState, reduceAppState, type AppState } from "./app-state";
import type { WorldBridge } from "../world/bridge/world-events";
import { createDemoController } from "../ui/demo-controller";
import { CATALOG } from "../catalog/catalog";
import { findAvailableDemoForAttraction } from "../ui/demo-directory";
import { readMotionOverride, writeMotionOverride } from "./motion-preference";
import { createCameraControls } from "../ui/camera-controls";

interface AppElements {
  exploreButton: HTMLButtonElement;
  worldControl: HTMLElement;
  worldStatus: HTMLElement;
  loadingStatus: HTMLElement;
  debugPosition: HTMLOutputElement;
  debugFps: HTMLOutputElement;
}

const movementKeys = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "KeyA",
  "KeyD",
  "KeyS",
  "KeyW",
]);

export function createAppController(elements: AppElements, bridge: WorldBridge) {
  let motionOverride: boolean | null = null;
  try {
    motionOverride = readMotionOverride(window.localStorage);
  } catch {
    /* Storage may be disabled. */
  }
  let state: AppState = createInitialAppState(
    motionOverride ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const motion = document.querySelector<HTMLInputElement>("[data-reduced-motion]");
  const controlDeck = document.querySelector<HTMLDetailsElement>("[data-control-deck]");
  const prompt = document.querySelector<HTMLElement>("[data-attraction-prompt]");
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion) motion.checked = state.settings.reducedMotion;
  const demoController = createDemoController({
    bridge,
    worldControl: elements.worldControl,
    getState: () => state,
    returnToWorld: () => activate(),
    setVisited: (ids) => {
      state = { ...state, visitedDemoIds: ids };
    },
    setDemo: (id) => {
      state = {
        ...state,
        openDemoId: id,
        mode: id ? "demo-open" : state.error ? "error" : "document",
      };
    },
  });

  const stopCameraControls = createCameraControls(
    elements.worldControl,
    bridge,
    () => state.worldReady && !state.error && !demoController.isBusy() && !document.hidden,
  );
  const stopListening = bridge.onEvent((event) => {
    switch (event.type) {
      case "world-ready":
        state = reduceAppState(state, event);
        elements.exploreButton.disabled = false;
        elements.loadingStatus.hidden = true;
        elements.worldStatus.textContent =
          "Fairground ready. Choose Explore, or focus the fairground, to begin.";
        bridge.command({ type: "apply-settings", settings: state.settings });
        break;
      case "attraction-entered": {
        state = { ...state, activeAttractionId: event.attractionId };
        const demo = findAvailableDemoForAttraction(
          CATALOG.demos,
          CATALOG.attractions,
          event.attractionId,
        );
        if (prompt && demo) {
          prompt.hidden = false;
          prompt.textContent = `${demo.title}. Press Enter or Space to open.`;
          const open = document.createElement("button");
          open.type = "button";
          open.dataset.activateAttraction = "";
          open.textContent = "Open demo";
          prompt.append(open);
        }
        break;
      }
      case "attraction-left":
        if (state.activeAttractionId === event.attractionId) {
          state = { ...state, activeAttractionId: null };
          if (prompt) {
            prompt.hidden = true;
            prompt.textContent = "";
          }
        }
        break;
      case "player-position-changed":
        state = reduceAppState(state, event);
        break;
      case "world-diagnostics":
        elements.debugPosition.value = `x ${event.x}, y ${event.y}`;
        elements.debugFps.value = String(event.fps);
        break;
      case "world-error":
        state = reduceAppState(state, event);
        elements.exploreButton.disabled = true;
        elements.loadingStatus.hidden = false;
        elements.loadingStatus.textContent =
          "The fairground could not load. The demo directory remains available.";
        elements.worldStatus.textContent = "Fairground unavailable.";
        break;
    }
  });

  const activate = () => {
    if (!state.worldReady || state.mode === "error" || demoController.isBusy()) {
      return;
    }

    if (state.mode === "paused") {
      state = reduceAppState(state, { type: "world-resumed" });
      bridge.command({ type: "resume" });
    } else {
      state = reduceAppState(state, { type: "exploration-started" });
    }

    bridge.command({ type: "apply-settings", settings: state.settings });
    bridge.command({ type: "activate-controls" });
    if (controlDeck) controlDeck.open = false;
    elements.worldStatus.textContent =
      "Exploring. Move with Arrow keys or WASD. Press Escape or Tab to stop.";
  };

  const deactivate = () => {
    if (state.mode !== "exploring") {
      return;
    }

    bridge.command({ type: "deactivate-controls" });
    state = reduceAppState(state, { type: "exploration-stopped" });
    elements.worldStatus.textContent = "Exploration stopped. Focus the fairground to continue.";
  };

  const handleExplore = () => {
    if (!state.worldReady) {
      return;
    }

    elements.worldControl.focus();
  };
  const handleFocus = () => activate();
  const handleBlur = () => deactivate();
  const handleKeyDown = (event: KeyboardEvent) => {
    if (state.mode === "exploring" && movementKeys.has(event.code)) {
      event.preventDefault();
      return;
    }

    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    deactivate();
    if (controlDeck) controlDeck.open = true;
    elements.exploreButton.focus();
  };
  const handleVisibilityChange = () => {
    if (document.hidden && state.mode === "exploring") {
      bridge.command({ type: "deactivate-controls" });
      bridge.command({ type: "pause" });
      state = reduceAppState(state, { type: "world-paused" });
    } else if (
      !document.hidden &&
      state.mode === "paused" &&
      document.activeElement === elements.worldControl
    ) {
      activate();
    }
  };
  const applyMotion = (reducedMotion: boolean) => {
    state = { ...state, settings: { ...state.settings, reducedMotion } };
    if (motion) motion.checked = reducedMotion;
    bridge.command({ type: "apply-settings", settings: state.settings });
  };
  const handleMotion = () => {
    motionOverride = motion?.checked ?? media.matches;
    try {
      writeMotionOverride(window.localStorage, motionOverride);
    } catch {
      /* Preserve the session override if storage is disabled. */
    }
    applyMotion(motionOverride);
  };
  const handleSystemMotion = () => {
    if (motionOverride === null) applyMotion(media.matches);
  };
  const handlePrompt = (event: Event) => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-activate-attraction]") &&
      state.activeAttractionId
    ) {
      demoController.openAttraction(state.activeAttractionId);
    }
  };
  const browse = document.querySelector<HTMLAnchorElement>('a[href="#demo-directory"]');
  const handleBrowse = (event: Event) => {
    const directory = document.querySelector("[data-demo-directory]");
    if (directory instanceof HTMLDetailsElement) {
      event.preventDefault();
      directory.open = true;
      directory.querySelector("summary")?.focus();
    }
  };

  elements.exploreButton.addEventListener("click", handleExplore);
  elements.worldControl.addEventListener("focus", handleFocus);
  elements.worldControl.addEventListener("blur", handleBlur);
  elements.worldControl.addEventListener("keydown", handleKeyDown);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  motion?.addEventListener("change", handleMotion);
  media.addEventListener("change", handleSystemMotion);
  browse?.addEventListener("click", handleBrowse);
  prompt?.addEventListener("click", handlePrompt);

  return {
    getState: () => state,
    destroy() {
      stopCameraControls();
      demoController.destroy();
      stopListening();
      elements.exploreButton.removeEventListener("click", handleExplore);
      elements.worldControl.removeEventListener("focus", handleFocus);
      elements.worldControl.removeEventListener("blur", handleBlur);
      elements.worldControl.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motion?.removeEventListener("change", handleMotion);
      media.removeEventListener("change", handleSystemMotion);
      browse?.removeEventListener("click", handleBrowse);
      prompt?.removeEventListener("click", handlePrompt);
    },
  };
}

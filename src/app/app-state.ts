export type AppMode =
  | "document"
  | "exploring"
  | "demo-open"
  | "directory-open"
  | "paused"
  | "error";

export type MovementScheme = "arrows-and-wasd" | "arrows-only" | "wasd-only";

export interface UserSettings {
  reducedMotion: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  movementScheme: MovementScheme;
  showInteractionHints: boolean;
  highContrastWorldIndicators: boolean;
}

export interface AppState {
  mode: AppMode;
  worldReady: boolean;
  activeAttractionId: string | null;
  openDemoId: string | null;
  visitedDemoIds: Set<string>;
  lastPlayerPosition: { x: number; y: number } | null;
  settings: UserSettings;
  error: Error | null;
}

export type AppAction =
  | { type: "world-ready" }
  | { type: "exploration-started" }
  | { type: "exploration-stopped" }
  | { type: "world-paused" }
  | { type: "world-resumed" }
  | { type: "player-position-changed"; x: number; y: number }
  | { type: "world-error"; error: Error };

export function createInitialAppState(reducedMotion: boolean): AppState {
  return {
    mode: "document",
    worldReady: false,
    activeAttractionId: null,
    openDemoId: null,
    visitedDemoIds: new Set(),
    lastPlayerPosition: null,
    settings: {
      reducedMotion,
      soundEnabled: true,
      musicEnabled: true,
      movementScheme: "arrows-and-wasd",
      showInteractionHints: true,
      highContrastWorldIndicators: false,
    },
    error: null,
  };
}

export function reduceAppState(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "world-ready":
      return { ...state, worldReady: true };
    case "exploration-started":
      return state.worldReady ? { ...state, mode: "exploring" } : state;
    case "exploration-stopped":
      return { ...state, mode: "document" };
    case "world-paused":
      return state.mode === "exploring" ? { ...state, mode: "paused" } : state;
    case "world-resumed":
      return state.mode === "paused" ? { ...state, mode: "exploring" } : state;
    case "player-position-changed":
      return {
        ...state,
        lastPlayerPosition: { x: action.x, y: action.y },
      };
    case "world-error":
      return { ...state, mode: "error", error: action.error };
  }
}

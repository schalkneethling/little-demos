import type { UserSettings } from "../../app/app-state";

export type WorldEvent =
  | { type: "camera-changed"; zoom: number; manual: boolean; x: number; y: number }
  | { type: "world-ready" }
  | { type: "attraction-entered"; attractionId: string }
  | { type: "attraction-left"; attractionId: string }
  | { type: "attraction-activated"; attractionId: string }
  | { type: "attraction-exit-complete"; attractionId: string }
  | { type: "player-position-changed"; x: number; y: number }
  | { type: "world-diagnostics"; x: number; y: number; fps: number }
  | { type: "world-error"; error: Error };

export type WorldCommand =
  | { type: "camera-pan"; x: number; y: number }
  | { type: "camera-zoom"; factor: number }
  | { type: "camera-return" }
  | { type: "activate-controls" }
  | { type: "deactivate-controls" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "play-attraction-exit"; attractionId: string }
  | { type: "set-visited"; demoId: string }
  | { type: "teleport-to-attraction"; attractionId: string }
  | { type: "apply-settings"; settings: UserSettings };

export interface WorldBridge {
  emit(event: WorldEvent): void;
  onEvent(listener: (event: WorldEvent) => void): () => void;
  command(command: WorldCommand): void;
  onCommand(listener: (command: WorldCommand) => void): () => void;
}

export function createWorldBridge(): WorldBridge {
  const eventListeners = new Set<(event: WorldEvent) => void>();
  const commandListeners = new Set<(command: WorldCommand) => void>();

  return {
    emit(event) {
      eventListeners.forEach((listener) => listener(event));
    },
    onEvent(listener) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    command(command) {
      commandListeners.forEach((listener) => listener(command));
    },
    onCommand(listener) {
      commandListeners.add(listener);
      return () => commandListeners.delete(listener);
    },
  };
}

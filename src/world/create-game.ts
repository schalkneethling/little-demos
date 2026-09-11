import Phaser from "phaser";
import type { UserSettings } from "../app/app-state";
import type { WorldBridge } from "./bridge/world-events";
import { ARCADE_PHYSICS_CONFIG } from "./config";
import { KeyboardInput } from "./input/keyboard-input";
import { BootScene } from "./scenes/boot-scene";
import { createFairgroundScene } from "./scenes/fairground-scene";

interface CreateGameOptions {
  canvasHost: HTMLElement;
  controlTarget: HTMLElement;
  bridge: WorldBridge;
  settings: UserSettings;
  debug: boolean;
}

export async function createGame({
  canvasHost,
  controlTarget,
  bridge,
  settings,
  debug,
}: CreateGameOptions) {
  const input = new KeyboardInput(controlTarget, settings.movementScheme);
  const FairgroundScene = createFairgroundScene({
    bridge,
    input,
    initialSettings: settings,
    debug,
  });

  try {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: canvasHost,
      backgroundColor: "#b7d6a3",
      physics: {
        default: "arcade",
        arcade: ARCADE_PHYSICS_CONFIG,
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: 960,
        height: 600,
      },
      scene: [BootScene, FairgroundScene],
    });

    return {
      destroy() {
        input.destroy();
        game.destroy(true);
      },
    };
  } catch (cause) {
    input.destroy();
    const error =
      cause instanceof Error
        ? cause
        : new Error("The fairground could not be initialized.", { cause });
    bridge.emit({ type: "world-error", error });
    throw error;
  }
}

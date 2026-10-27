import Phaser from "phaser";
import { ASSETS } from "../assets/asset-registry";
import {
  cancelPendingImage,
  resolveAssetState,
  type AssetLoadStates,
} from "../assets/asset-loading";

export class BootScene extends Phaser.Scene {
  #watchdog: ReturnType<typeof setTimeout> | undefined;
  #settled = false;
  #pendingFiles = new Map<string, Phaser.Loader.File>();
  constructor() {
    super("boot");
  }

  preload() {
    this.#settled = false;
    this.#pendingFiles.clear();
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, (key: string) =>
      this.#pendingFiles.delete(key),
    );
    for (const asset of ASSETS) {
      const art = asset.runtime;
      if (!art || art.loadGroup !== "initial-world" || this.textures.exists(asset.key)) continue;
      const config = {
        key: asset.key,
        url: art.url,
        xhrSettings: { timeout: 6000, responseType: "blob" as const },
      };
      if (art.frames)
        this.load.spritesheet({
          ...config,
          frameConfig: { frameWidth: art.frames.frameWidth, frameHeight: art.frames.frameHeight },
        });
      else this.load.image(config);
    }
    for (const file of this.load.list) this.#pendingFiles.set(file.key, file);
    // Also bound decode/processing, not merely the network request phase.
    this.#watchdog = setTimeout(() => {
      this.#cancelPending();
      this.load.reset();
      this.#startFairground();
    }, 9000);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearTimeout(this.#watchdog);
      this.#cancelPending();
    });
  }

  #cancelPending() {
    for (const file of this.#pendingFiles.values()) cancelPendingImage(file);
    this.#pendingFiles.clear();
  }

  #startFairground() {
    if (this.#settled) return;
    this.#settled = true;
    clearTimeout(this.#watchdog);
    const states: AssetLoadStates = {};
    for (const asset of ASSETS) {
      if (!asset.runtime || asset.runtime.loadGroup !== "initial-world") continue;
      const texture = this.textures.exists(asset.key) ? this.textures.get(asset.key) : undefined;
      const source = texture?.source[0];
      states[asset.key] = resolveAssetState(
        Boolean(
          texture &&
          source?.width === asset.runtime.width &&
          source.height === asset.runtime.height,
        ),
        asset.runtime.frames,
        (index) => texture?.has(String(index)) ?? false,
      );
      if (states[asset.key] === "fallback")
        console.warn(`World artwork unavailable; using fallback: ${asset.key}`);
    }
    this.registry.set("world-art-state", states);
    this.scene.start("fairground");
  }

  create() {
    this.#startFairground();
  }
}

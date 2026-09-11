import Phaser from "phaser";
import type { UserSettings } from "../../app/app-state";
import {
  getAttractionExitPlan,
  getAttractionSelectionChange,
  isAttractionInteractive,
  selectNearestAttraction,
} from "../attractions/attraction-controller";
import { ATTRACTIONS, getAttractionById } from "../attractions/attraction-registry";
import { ASSET_BY_KEY } from "../assets/asset-registry";
import type { AssetLoadStates } from "../assets/asset-loading";
import { getPlayerArtFrame, type PlayerFacing } from "../rendering/player-art";
import { getVisualFixture } from "../rendering/visual-fixtures";
import { createSilhouetteGlow, GLOW_PADDING } from "../rendering/silhouette-glow";
import { ARCADE_PLANTERS } from "../rendering/arcade-decoration";
import type { WorldBridge } from "../bridge/world-events";
import type { KeyboardInput } from "../input/keyboard-input";
import { createDiagnosticsThrottle } from "../diagnostics";
import { FAIRGROUND_MAP } from "../map/fairground-map";
import {
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_OFFSET_X,
  PLAYER_BODY_OFFSET_Y,
  PLAYER_BODY_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
} from "../player/player-geometry";
import { getMovementVelocity } from "../player/player-movement";
import {
  createAttractionRenderPlan,
  getAttractionVisualState,
  getInteractionMarkerPosition,
  getAttractionCaptionPosition,
  type AttractionRenderPlan,
} from "../rendering/attraction-render-plan";
import { getCameraFollowLerp, getVoidSafeCameraZoom } from "../systems/camera-system";
import { clampCameraZoom } from "../systems/camera-navigation";

const PLAYER_SPEED = 220;
const POSITION_REPORT_INTERVAL = 250;
const POSITION_REPORT_DISTANCE = 4;
const DIAGNOSTICS_REPORT_INTERVAL = 500;
const WORLD_OVERLAY_DEPTH = FAIRGROUND_MAP.height + 1;

interface FairgroundSceneDependencies {
  bridge: WorldBridge;
  input: KeyboardInput;
  initialSettings: UserSettings;
  debug: boolean;
}

interface AttractionVisual {
  plan: AttractionRenderPlan;
  structure: Phaser.GameObjects.Rectangle | null;
  artwork: Phaser.GameObjects.Image | null;
  glow: Phaser.GameObjects.Image | null;
  glowKeys: { warm: string; contrast: string } | null;
  label: Phaser.GameObjects.Text;
  interactionMarker: Phaser.GameObjects.Container | null;
  visited: boolean;
}

export function createFairgroundScene({
  bridge,
  input,
  initialSettings,
  debug,
}: FairgroundSceneDependencies) {
  return class FairgroundScene extends Phaser.Scene {
    #player!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;
    #playerShadow?: Phaser.GameObjects.Ellipse;
    #playerFacing: PlayerFacing = "south";
    #playerFrame = 0;
    #artStates: AssetLoadStates = {};
    #visualTest = false;
    #controlsActive = false;
    #exiting = false;
    #manualCamera = false;
    #selectedAttractionId: string | null = null;
    #settings = initialSettings;
    #unsubscribeCommands: (() => void) | null = null;
    #lastPosition = { ...FAIRGROUND_MAP.spawn };
    #lastPositionReportAt = 0;
    readonly #attractionVisuals = new Map<string, AttractionVisual>();
    readonly #diagnosticsThrottle = createDiagnosticsThrottle(DIAGNOSTICS_REPORT_INTERVAL);

    constructor() {
      super("fairground");
    }

    create() {
      this.#artStates = this.registry.get("world-art-state") ?? {};
      const visualFixture = getVisualFixture(
        debug,
        new URLSearchParams(window.location.search).get("visual-test"),
      );
      this.#visualTest = visualFixture !== undefined;
      this.cameras.main.setBackgroundColor(0xb7d6a3);
      this.physics.world.setBounds(0, 0, FAIRGROUND_MAP.width, FAIRGROUND_MAP.height);
      this.cameras.main.setBounds(0, 0, FAIRGROUND_MAP.width, FAIRGROUND_MAP.height);

      this.add
        .rectangle(
          FAIRGROUND_MAP.width / 2,
          FAIRGROUND_MAP.height / 2,
          FAIRGROUND_MAP.width,
          FAIRGROUND_MAP.height,
          ASSET_BY_KEY.get("surface/ground/grass-a")?.placeholder.color ?? 0x99bd7c,
        )
        .setDepth(-10);
      if (this.#artReady("surface/ground/grass-a")) {
        this.add
          .tileSprite(0, 0, FAIRGROUND_MAP.width, FAIRGROUND_MAP.height, "surface/ground/grass-a")
          .setOrigin(0)
          .setDepth(-9);
      }

      for (const path of FAIRGROUND_MAP.paths) {
        this.add
          .rectangle(
            path.x + path.width / 2,
            path.y + path.height / 2,
            path.width,
            path.height,
            ASSET_BY_KEY.get("surface/path/clay")?.placeholder.color ?? 0xe5d3a2,
          )
          .setDepth(-5);
        if (this.#artReady("surface/path/clay")) {
          this.add
            .tileSprite(path.x, path.y, path.width, path.height, "surface/path/clay")
            .setOrigin(0)
            .setTilePosition(path.x, path.y)
            .setDepth(-4);
        }
      }

      const obstacles: Phaser.GameObjects.Rectangle[] = [];
      const attractionRenderPlan = createAttractionRenderPlan(ATTRACTIONS, ASSET_BY_KEY);
      for (const plan of attractionRenderPlan) {
        const art = plan.artwork;
        const artwork =
          art && this.#artReady(art.key)
            ? this.add.image(art.x, art.y, art.key).setOrigin(0).setDepth(plan.structureDepth)
            : null;
        const glowKeys = artwork && art ? createSilhouetteGlow(this.textures, art) : null;
        const glow =
          glowKeys && art
            ? this.add
                .image(art.x - GLOW_PADDING, art.y - GLOW_PADDING, glowKeys.warm)
                .setOrigin(0)
                .setDepth(plan.structureDepth - 0.01)
                .setVisible(false)
            : null;
        const placeholder = artwork
          ? null
          : this.add
              .rectangle(
                plan.center.x,
                plan.center.y,
                plan.size.width,
                plan.size.height,
                plan.baseColor,
              )
              .setDepth(plan.structureDepth + 0.005);
        placeholder?.setStrokeStyle(4, 0x25362d);

        const captionPosition = getAttractionCaptionPosition(plan);
        const label = this.add
          .text(captionPosition.x, captionPosition.y, plan.label, {
            align: art ? "left" : "center",
            color: art ? "#173449" : "#ffffff",
            fontFamily: "sans-serif",
            fontSize: art ? "14px" : "22px",
            fontStyle: "bold",
            ...(art
              ? { stroke: "#fff8e6", strokeThickness: 3, wordWrap: { width: 220 }, lineSpacing: 2 }
              : {}),
          })
          .setOrigin(art ? 0 : 0.5)
          .setDepth(plan.labelDepth);

        for (const shape of plan.collisionShapes) {
          const collisionBody = this.add
            .rectangle(
              shape.x + shape.width / 2,
              shape.y + shape.height / 2,
              shape.width,
              shape.height,
              0x000000,
              0,
            )
            .setVisible(false);
          this.physics.add.existing(collisionBody, true);
          obstacles.push(collisionBody);
        }

        let interactionMarker: Phaser.GameObjects.Container | null = null;
        if (plan.interactive) {
          const zone = plan.interactionZone;
          const markerPosition = getInteractionMarkerPosition(plan);
          const zoneOutline = this.add
            .rectangle(
              zone.x + zone.width / 2,
              zone.y + zone.height / 2,
              zone.width,
              zone.height,
              0xffef9a,
              debug && !this.#visualTest ? 0.18 : 0,
            )
            .setStrokeStyle(debug && !this.#visualTest ? 2 : 0, 0x25362d);
          const interactionText = this.add
            .text(
              markerPosition.x,
              markerPosition.y,
              art ? "Enter / Space to open" : "ENTER / SPACE",
              {
                ...(art
                  ? { stroke: "#fff8e6", strokeThickness: 3 }
                  : { backgroundColor: "#25362d" }),
                color: art ? "#173449" : "#fff8d8",
                fontFamily: "sans-serif",
                fontSize: art ? "13px" : "18px",
                fontStyle: "bold",
                padding: art ? { x: 0, y: 0 } : { x: 10, y: 6 },
              },
            )
            .setOrigin(art ? 0 : 0.5);
          interactionMarker = this.add
            .container(0, 0, [zoneOutline, interactionText])
            .setDepth(WORLD_OVERLAY_DEPTH)
            .setVisible(false);
        }

        this.#attractionVisuals.set(plan.id, {
          plan,
          structure: placeholder,
          artwork,
          glow,
          glowKeys,
          label,
          interactionMarker,
          visited: false,
        });
      }

      // Authored decoration stays within the existing solid arcade footprint.
      for (const position of ARCADE_PLANTERS) {
        const prop = ASSET_BY_KEY.get("prop/planter");
        const art = prop?.runtime;
        if (art?.anchor && this.#artReady("prop/planter")) {
          this.add
            .image(position.x - art.anchor.x, position.y - art.anchor.y, "prop/planter")
            .setOrigin(0)
            .setDepth(1060.002);
        } else if (prop) {
          this.add
            .rectangle(
              position.x,
              position.y - prop.placeholder.height / 2,
              prop.placeholder.width,
              prop.placeholder.height,
              prop.placeholder.color,
            )
            .setDepth(1060.002);
        }
      }

      this.#player = this.#artReady("player/walk")
        ? this.add
            .sprite(FAIRGROUND_MAP.spawn.x, FAIRGROUND_MAP.spawn.y, "player/walk", 0)
            .setOrigin(0.5, 0.5)
        : this.add.rectangle(
            FAIRGROUND_MAP.spawn.x,
            FAIRGROUND_MAP.spawn.y,
            PLAYER_WIDTH,
            PLAYER_HEIGHT,
            ASSET_BY_KEY.get("player/walk")?.placeholder.color ?? 0x26343d,
          );
      if (this.#player instanceof Phaser.GameObjects.Rectangle)
        this.#player.setStrokeStyle(3, 0xffffff);
      this.#playerShadow = this.add.ellipse(this.#player.x, this.#player.y, 20, 8, 0x173449, 0.15);
      this.physics.add.existing(this.#player);

      const body = this.#player.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT, false);
      body.setOffset(PLAYER_BODY_OFFSET_X, PLAYER_BODY_OFFSET_Y);
      this.#syncPlayerBody();

      for (const obstacle of obstacles) {
        this.physics.add.collider(this.#player, obstacle);
      }

      this.#applyCameraMotion();
      this.#resizeCamera(this.scale.gameSize.width, this.scale.gameSize.height);
      this.scale.on(Phaser.Scale.Events.RESIZE, this.#handleResize);

      if (visualFixture) {
        this.#player.setPosition(visualFixture.player.x, visualFixture.player.y);
        this.#syncPlayerBody();
        this.#manualCamera = true;
        this.cameras.main.stopFollow();
        this.cameras.main.setZoom(this.#clampZoom(visualFixture.camera.zoom));
        this.cameras.main.centerOn(visualFixture.camera.x, visualFixture.camera.y);
        const arcade = this.#attractionVisuals.get("arcade");
        if (arcade) arcade.visited = visualFixture.visited;
        this.#updateAttractionSelection({ x: body.center.x, y: body.center.y });
        this.#refreshAttractionVisuals();
      }

      if (debug && !this.#visualTest) {
        this.physics.world.createDebugGraphic();
      }

      this.#unsubscribeCommands = bridge.onCommand((command) => {
        switch (command.type) {
          case "camera-pan": {
            if (this.scene.isPaused() || this.#exiting) break;
            const camera = this.cameras.main;
            this.#manualCamera = true;
            camera.stopFollow();
            camera.setScroll(
              camera.scrollX + command.x / camera.zoom,
              camera.scrollY + command.y / camera.zoom,
            );
            this.#reportCamera();
            break;
          }
          case "camera-zoom":
            if (this.scene.isPaused() || this.#exiting) break;
            this.cameras.main.setZoom(this.#clampZoom(this.cameras.main.zoom * command.factor));
            this.#reportCamera();
            break;
          case "camera-return":
            this.#returnCamera(true);
            break;
          case "activate-controls":
            this.#controlsActive = true;
            input.activate();
            break;
          case "deactivate-controls":
            this.#stopMovement();
            input.deactivate();
            this.#controlsActive = false;
            break;
          case "pause":
            this.#stopMovement();
            this.scene.pause();
            break;
          case "resume":
            this.scene.resume();
            break;
          case "apply-settings":
            this.#settings = command.settings;
            input.setScheme(command.settings.movementScheme);
            this.#applyCameraMotion();
            this.#refreshAttractionVisuals();
            break;
          case "set-visited": {
            const attraction = ATTRACTIONS.find((item) => item.demoId === command.demoId);
            const visual = attraction ? this.#attractionVisuals.get(attraction.id) : undefined;
            if (visual && isAttractionInteractive(attraction)) {
              visual.visited = true;
              this.#refreshAttractionVisuals();
            }
            break;
          }
          case "teleport-to-attraction": {
            const attraction = getAttractionById(command.attractionId);
            if (isAttractionInteractive(attraction)) {
              this.#player.setPosition(
                attraction.entrancePosition.x,
                attraction.entrancePosition.y,
              );
              this.#syncPlayerBody();
              this.#returnCamera();
            }
            break;
          }
          case "play-attraction-exit":
            this.#playAttractionExit(command.attractionId);
            break;
        }
      });

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.#unsubscribeCommands?.();
        this.#unsubscribeCommands = null;
        this.scale.off(Phaser.Scale.Events.RESIZE, this.#handleResize);
        const host = this.game.canvas.parentElement;
        if (debug && host) {
          for (const key of [
            "worldArtReady",
            "worldArtState",
            "playerFrame",
            "playerX",
            "playerY",
            "playerGroundX",
            "playerGroundY",
          ])
            delete host.dataset[key];
        }
      });

      bridge.emit({ type: "world-ready" });
      this.#reportCamera();
      if (debug) {
        const report = () => this.#reportPlayerArt();
        this.events.on(Phaser.Scenes.Events.POST_UPDATE, report);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
          this.events.off(Phaser.Scenes.Events.POST_UPDATE, report),
        );
        const host = this.game.canvas.parentElement;
        if (host) {
          host.dataset.worldArtState = JSON.stringify(this.#artStates);
          host.dataset.worldArtReady = "true";
        }
        this.#reportPlayerArt();
      }
    }

    update(time: number) {
      const velocity = getMovementVelocity(input.getIntent(), PLAYER_SPEED, this.#controlsActive);
      const body = this.#player.body as Phaser.Physics.Arcade.Body;
      if (this.#manualCamera && (velocity.x !== 0 || velocity.y !== 0)) this.#returnCamera();
      body.setVelocity(velocity.x, velocity.y);
      this.#updatePlayerDepth();
      this.#updatePlayerArt(this.#exiting ? { x: 0, y: 1 } : velocity, time);

      if (!this.#exiting) {
        this.#updateAttractionSelection({ x: body.center.x, y: body.center.y });
        const interactionRequested = this.#controlsActive && input.consumeInteraction();

        if (this.#controlsActive && this.#selectedAttractionId && interactionRequested) {
          const attractionId = this.#selectedAttractionId;
          if (isAttractionInteractive(getAttractionById(attractionId))) {
            this.#stopMovement();
            input.deactivate();
            this.#controlsActive = false;
            bridge.emit({ type: "attraction-activated", attractionId });
          }
        }
      }

      if (debug && this.#diagnosticsThrottle.shouldReport(time)) {
        const actualFps = this.game.loop.actualFps;
        bridge.emit({
          type: "world-diagnostics",
          x: Math.round(this.#player.x),
          y: Math.round(this.#player.y),
          fps: Number.isFinite(actualFps) ? Math.round(actualFps) : 0,
        });
      }

      if (
        time - this.#lastPositionReportAt >= POSITION_REPORT_INTERVAL &&
        Phaser.Math.Distance.Between(
          this.#lastPosition.x,
          this.#lastPosition.y,
          this.#player.x,
          this.#player.y,
        ) >= POSITION_REPORT_DISTANCE
      ) {
        this.#lastPosition = { x: this.#player.x, y: this.#player.y };
        this.#lastPositionReportAt = time;
        bridge.emit({
          type: "player-position-changed",
          x: this.#player.x,
          y: this.#player.y,
        });
      }
    }

    #stopMovement() {
      const body = this.#player?.body as Phaser.Physics.Arcade.Body | undefined;
      body?.setVelocity(0, 0);
      if (this.#player) this.#updatePlayerArt({ x: 0, y: 0 }, 0);
    }

    #updateAttractionSelection(playerGroundPosition: { x: number; y: number }) {
      const nextAttractionId =
        selectNearestAttraction(ATTRACTIONS, playerGroundPosition)?.id ?? null;
      const events = getAttractionSelectionChange(this.#selectedAttractionId, nextAttractionId);
      if (events.length === 0) {
        return;
      }

      this.#selectedAttractionId = nextAttractionId;
      this.#refreshAttractionVisuals();
      for (const event of events) {
        bridge.emit(event);
      }
    }

    #refreshAttractionVisuals() {
      for (const [attractionId, visual] of this.#attractionVisuals) {
        const selected = attractionId === this.#selectedAttractionId;
        const state = getAttractionVisualState(visual.plan, {
          selected,
          visited: visual.visited,
          highContrast: this.#settings.highContrastWorldIndicators,
          artworkReady: visual.artwork !== null,
        });
        visual.structure?.setFillStyle(state.fillColor);
        visual.structure?.setStrokeStyle(state.strokeWidth, state.strokeColor);
        if (visual.glow && visual.glowKeys) {
          visual.glow
            .setTexture(state.glow?.highContrast ? visual.glowKeys.contrast : visual.glowKeys.warm)
            .setVisible(state.glow?.visible ?? false);
        }
        const art = visual.plan.artwork;
        if (visual.artwork && art) {
          visual.artwork.setTexture(
            selected && art.selectedKey && this.#artReady(art.selectedKey)
              ? art.selectedKey
              : art.key,
          );
        }
        visual.label.setText(state.label);
        visual.interactionMarker?.setVisible(state.showInteractionMarker);
      }
    }

    #playAttractionExit(attractionId: string) {
      const attraction = getAttractionById(attractionId);
      const exitPlan = getAttractionExitPlan(attraction);
      if (exitPlan.type === "blocked" || this.#exiting) {
        return;
      }

      this.scene.resume();
      this.#controlsActive = false;
      input.deactivate();
      this.#stopMovement();
      if (exitPlan.type === "immediate") {
        bridge.emit({ type: "attraction-exit-complete", attractionId });
        return;
      }

      const exit = exitPlan.animation;
      this.#exiting = true;
      this.#player.setPosition(exit.from.x, exit.from.y);
      this.#syncPlayerBody();

      const complete = () => {
        this.#player.setPosition(exit.to.x, exit.to.y);
        this.#syncPlayerBody();
        this.#exiting = false;
        this.#playerFacing = "south";
        this.#updatePlayerArt({ x: 0, y: 0 }, 0);
        bridge.emit({ type: "attraction-exit-complete", attractionId });
      };

      if (this.#settings.reducedMotion) {
        complete();
        return;
      }

      this.tweens.add({
        targets: this.#player,
        x: exit.to.x,
        y: exit.to.y,
        duration: exit.durationMs,
        ease: "Sine.easeOut",
        onComplete: complete,
      });
    }

    #resizeCamera(viewportWidth: number, viewportHeight: number) {
      this.cameras.main.setZoom(
        clampCameraZoom(
          this.cameras.main.zoom,
          FAIRGROUND_MAP.width,
          FAIRGROUND_MAP.height,
          viewportWidth,
          viewportHeight,
        ),
      );
      this.#reportCamera();
    }

    #clampZoom(zoom: number) {
      return clampCameraZoom(
        zoom,
        FAIRGROUND_MAP.width,
        FAIRGROUND_MAP.height,
        this.scale.gameSize.width,
        this.scale.gameSize.height,
      );
    }

    #reportCamera() {
      const camera = this.cameras.main;
      camera.setScroll(camera.clampX(camera.scrollX), camera.clampY(camera.scrollY));
      bridge.emit({
        type: "camera-changed",
        zoom: camera.zoom,
        manual: this.#manualCamera,
        x: camera.scrollX,
        y: camera.scrollY,
      });
    }

    #returnCamera(resetZoom = false) {
      this.#manualCamera = false;
      this.cameras.main.setZoom(
        clampCameraZoom(
          resetZoom
            ? getVoidSafeCameraZoom(
                FAIRGROUND_MAP.width,
                FAIRGROUND_MAP.height,
                this.scale.gameSize.width,
                this.scale.gameSize.height,
              )
            : this.cameras.main.zoom,
          FAIRGROUND_MAP.width,
          FAIRGROUND_MAP.height,
          this.scale.gameSize.width,
          this.scale.gameSize.height,
        ),
      );
      this.cameras.main.centerOn(this.#player.x, this.#player.y);
      this.#applyCameraMotion();
      this.#reportCamera();
    }

    #applyCameraMotion() {
      if (this.#manualCamera) return;
      const camera = this.cameras.main;
      const lerp = getCameraFollowLerp(this.#settings.reducedMotion);
      camera.startFollow(this.#player, true, lerp, lerp);
      if (this.#settings.reducedMotion) {
        camera.setDeadzone();
      } else {
        camera.setDeadzone(180, 130);
      }
    }

    readonly #handleResize = (gameSize: Phaser.Structs.Size) => {
      this.#resizeCamera(gameSize.width, gameSize.height);
    };

    #syncPlayerBody() {
      const body = this.#player.body as Phaser.Physics.Arcade.Body;
      body.updateFromGameObject();
      this.#updatePlayerDepth();
      this.#reportPlayerArt();
    }

    #artReady(key: string) {
      return this.#artStates[key] === "ready" && this.textures.exists(key);
    }

    #updatePlayerArt(velocity: { x: number; y: number }, time: number) {
      const state = this.#visualTest
        ? { facing: "south" as const, frame: 0 }
        : getPlayerArtFrame(velocity, this.#playerFacing, this.#settings.reducedMotion, time);
      this.#playerFacing = state.facing;
      this.#playerFrame = state.frame;
      if (this.#player instanceof Phaser.GameObjects.Sprite) this.#player.setFrame(state.frame);
      this.#reportPlayerArt();
    }

    #reportPlayerArt() {
      if (!debug || !this.#player) return;
      const host = this.game.canvas.parentElement;
      const body = this.#player.body as Phaser.Physics.Arcade.Body;
      if (!host || !body) return;
      host.dataset.playerFrame = String(this.#playerFrame);
      host.dataset.playerX = String(this.#player.x);
      host.dataset.playerY = String(this.#player.y);
      host.dataset.playerGroundX = String(body.center.x);
      host.dataset.playerGroundY = String(body.center.y);
    }

    #updatePlayerDepth() {
      const body = this.#player.body as Phaser.Physics.Arcade.Body;
      this.#player.setDepth(body.bottom);
      this.#playerShadow?.setPosition(body.center.x, body.bottom).setDepth(body.bottom - 0.02);
    }
  };
}

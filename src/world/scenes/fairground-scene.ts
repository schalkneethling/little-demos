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
  structure: Phaser.GameObjects.Rectangle;
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
    #player!: Phaser.GameObjects.Rectangle;
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
      this.cameras.main.setBackgroundColor(0xb7d6a3);
      this.physics.world.setBounds(0, 0, FAIRGROUND_MAP.width, FAIRGROUND_MAP.height);
      this.cameras.main.setBounds(0, 0, FAIRGROUND_MAP.width, FAIRGROUND_MAP.height);

      this.add
        .rectangle(
          FAIRGROUND_MAP.width / 2,
          FAIRGROUND_MAP.height / 2,
          FAIRGROUND_MAP.width,
          FAIRGROUND_MAP.height,
          0x99bd7c,
        )
        .setDepth(-10);

      for (const path of FAIRGROUND_MAP.paths) {
        this.add
          .rectangle(
            path.x + path.width / 2,
            path.y + path.height / 2,
            path.width,
            path.height,
            0xe5d3a2,
          )
          .setDepth(-5);
      }

      const obstacles: Phaser.GameObjects.Rectangle[] = [];
      const attractionRenderPlan = createAttractionRenderPlan(ATTRACTIONS, ASSET_BY_KEY);
      for (const plan of attractionRenderPlan) {
        const placeholder = this.add
          .rectangle(
            plan.center.x,
            plan.center.y,
            plan.size.width,
            plan.size.height,
            plan.baseColor,
          )
          .setDepth(plan.structureDepth);
        placeholder.setStrokeStyle(4, 0x25362d);

        const label = this.add
          .text(plan.labelPosition.x, plan.labelPosition.y, plan.label, {
            align: "center",
            color: "#ffffff",
            fontFamily: "sans-serif",
            fontSize: "22px",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
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
          const zoneOutline = this.add
            .rectangle(
              zone.x + zone.width / 2,
              zone.y + zone.height / 2,
              zone.width,
              zone.height,
              0xffef9a,
              debug ? 0.18 : 0,
            )
            .setStrokeStyle(debug ? 2 : 0, 0x25362d);
          const interactionText = this.add
            .text(plan.entrancePosition.x, plan.interactionZone.y + 32, "ENTER / SPACE", {
              backgroundColor: "#25362d",
              color: "#fff8d8",
              fontFamily: "sans-serif",
              fontSize: "18px",
              fontStyle: "bold",
              padding: { x: 10, y: 6 },
            })
            .setOrigin(0.5);
          interactionMarker = this.add
            .container(0, 0, [zoneOutline, interactionText])
            .setDepth(WORLD_OVERLAY_DEPTH)
            .setVisible(false);
        }

        this.#attractionVisuals.set(plan.id, {
          plan,
          structure: placeholder,
          label,
          interactionMarker,
          visited: false,
        });
      }

      this.#player = this.add.rectangle(
        FAIRGROUND_MAP.spawn.x,
        FAIRGROUND_MAP.spawn.y,
        PLAYER_WIDTH,
        PLAYER_HEIGHT,
        0x26343d,
      );
      this.#player.setStrokeStyle(3, 0xffffff);
      this.physics.add.existing(this.#player);

      const body = this.#player.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT);
      body.setOffset(PLAYER_BODY_OFFSET_X, PLAYER_BODY_OFFSET_Y);
      this.#updatePlayerDepth();

      for (const obstacle of obstacles) {
        this.physics.add.collider(this.#player, obstacle);
      }

      this.#applyCameraMotion();
      this.#resizeCamera(this.scale.gameSize.width, this.scale.gameSize.height);
      this.scale.on(Phaser.Scale.Events.RESIZE, this.#handleResize);

      if (debug) {
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
      });

      bridge.emit({ type: "world-ready" });
      this.#reportCamera();
    }

    update(time: number) {
      const velocity = getMovementVelocity(input.getIntent(), PLAYER_SPEED, this.#controlsActive);
      const body = this.#player.body as Phaser.Physics.Arcade.Body;
      if (this.#manualCamera && (velocity.x !== 0 || velocity.y !== 0)) this.#returnCamera();
      body.setVelocity(velocity.x, velocity.y);
      this.#updatePlayerDepth();

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
        });
        visual.structure.setFillStyle(state.fillColor);
        visual.structure.setStrokeStyle(state.strokeWidth, state.strokeColor);
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
    }

    #updatePlayerDepth() {
      const body = this.#player.body as Phaser.Physics.Arcade.Body;
      this.#player.setDepth(body.bottom);
    }
  };
}

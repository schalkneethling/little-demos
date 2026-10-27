import Phaser from "phaser";
import { readMotionOverride } from "../../app/motion-preference";
import { ASSET_BY_KEY } from "../assets/asset-registry";
import { KeyboardInput } from "../input/keyboard-input";
import {
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_OFFSET_X,
  PLAYER_BODY_OFFSET_Y,
  PLAYER_BODY_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
} from "../player/player-geometry";
import { getMovementVelocity } from "../player/player-movement";
import { getPlayerArtFrame, type PlayerFacing } from "../rendering/player-art";
import { SPATIAL_PREVIEW, type Point, type Surface } from "./layout";

const ART_KEYS = [
  "attraction/arcade/base",
  "attraction/carousel/base",
  "attraction/ferris-wheel/base",
  "attraction/fountain/base",
  "attraction/tent/base",
  "player/walk",
  "prop/planter",
  "surface/ground/grass-a",
  "surface/path/clay",
] as const;

const COLORS = {
  ink: 0x173449,
  deepGrass: 0x69966b,
  grass: 0x91b77e,
  garden: 0x739c69,
  path: 0xd8b8a0,
  pathEdge: 0xc4a77e,
  cream: 0xf8f4e9,
  teal: 0x31777a,
  coral: 0xbb4d42,
  timber: 0x987859,
} as const;

function vectors(points: readonly Point[]): Phaser.Math.Vector2[] {
  return points.map(({ x, y }) => new Phaser.Math.Vector2(x, y));
}

function bounds(points: readonly Point[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.floor(Math.min(...xs));
  const y = Math.floor(Math.min(...ys));
  return {
    x,
    y,
    width: Math.ceil(Math.max(...xs)) - x,
    height: Math.ceil(Math.max(...ys)) - y,
  };
}

function savedReduction(): boolean {
  try {
    return readMotionOverride(window.localStorage) === true;
  } catch {
    return false;
  }
}

export class SpatialPreviewScene extends Phaser.Scene {
  readonly #keyboard: KeyboardInput;
  readonly #onStatus: (message: string) => void;
  readonly #onZoom: (zoom: number) => void;
  #player!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  #shadow!: Phaser.GameObjects.Ellipse;
  #facing: PlayerFacing = "south";
  #manualCamera = false;
  #ready = false;
  #nearbyPlot: string | null = null;
  readonly #motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  readonly #savedReduction = savedReduction();
  readonly #surfaceTextureKeys: string[] = [];

  constructor(
    keyboard: KeyboardInput,
    onStatus: (message: string) => void,
    onZoom: (zoom: number) => void,
  ) {
    super("spatial-preview");
    this.#keyboard = keyboard;
    this.#onStatus = onStatus;
    this.#onZoom = onZoom;
  }

  preload() {
    for (const key of ART_KEYS) {
      const art = ASSET_BY_KEY.get(key)?.runtime;
      if (!art) throw new Error(`Preview artwork missing from manifest: ${key}`);
      if (art.frames) {
        this.load.spritesheet(key, art.url, {
          frameWidth: art.frames.frameWidth,
          frameHeight: art.frames.frameHeight,
        });
      } else {
        this.load.image(key, art.url);
      }
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.grass);
    this.cameras.main.setBounds(0, 0, SPATIAL_PREVIEW.width, SPATIAL_PREVIEW.height);
    this.physics.world.setBounds(0, 0, SPATIAL_PREVIEW.width, SPATIAL_PREVIEW.height);

    this.add.rectangle(1_600, 1_200, 3_200, 2_400, COLORS.grass).setDepth(-100);
    if (this.textures.exists("surface/ground/grass-a")) {
      this.add.tileSprite(0, 0, 3_200, 2_400, "surface/ground/grass-a").setOrigin(0).setDepth(-99);
    }

    for (const surface of SPATIAL_PREVIEW.paths) this.#addPath(surface);
    this.#drawGarden();
    this.#drawPlots();
    this.#drawFountain();
    this.#drawPlayer();

    this.cameras.main.setZoom(1);
    this.cameras.main.startFollow(this.#player, false);
    this.cameras.main.setFollowOffset(0, 130);
    this.cameras.main.centerOn(SPATIAL_PREVIEW.spawn.x, SPATIAL_PREVIEW.spawn.y);
    this.#onZoom(1);

    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.#dragCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.#dragCamera, this);
      for (const key of this.#surfaceTextureKeys) this.textures.remove(key);
      this.#surfaceTextureKeys.length = 0;
    });

    this.#ready = true;
    this.#onStatus("Preview ready. Explore from the south arrival.");
  }

  #addPath(surface: Surface) {
    const points = vectors(surface.points);
    this.add.graphics().fillStyle(COLORS.pathEdge).fillPoints(points, true).setDepth(-50);
    // A smaller stroke softens the transition while the path keeps its authored outline.
    this.add
      .graphics()
      .lineStyle(7, COLORS.pathEdge, 0.48)
      .strokePoints(points, true)
      .fillStyle(COLORS.path)
      .fillPoints(points, true)
      .setDepth(-49);

    if (!this.textures.exists("surface/path/clay")) return;
    const box = bounds(surface.points);
    const source = this.textures.get("surface/path/clay").getSourceImage();
    if (!(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement)) return;
    // Gate-only rendering proof: preclip each tight surface, never a world-sized bitmap.
    // Production PR3 still needs a measured Phaser 4 WebGL mask implementation.
    const canvas = document.createElement("canvas");
    canvas.width = box.width;
    canvas.height = box.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const pattern = context.createPattern(source, "repeat");
    if (!pattern) return;
    context.translate(-box.x, -box.y);
    context.beginPath();
    surface.points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.clip();
    context.fillStyle = pattern;
    context.fillRect(box.x, box.y, box.width, box.height);
    const key = `spatial-preview/path/${surface.id}`;
    if (!this.textures.addCanvas(key, canvas)) return;
    this.#surfaceTextureKeys.push(key);
    this.add.image(box.x, box.y, key).setOrigin(0).setDepth(-48);
  }

  #drawGarden() {
    for (const bed of SPATIAL_PREVIEW.gardenBeds) {
      const points = vectors(bed.points);
      const fringe = this.add.graphics().fillStyle(COLORS.garden, 0.16);
      bed.points.forEach((point, index) => {
        const next = bed.points[(index + 1) % bed.points.length]!;
        fringe.fillEllipse(point.x, point.y, 22, 15);
        fringe.fillEllipse((point.x + next.x) / 2, (point.y + next.y) / 2, 24, 14);
      });
      fringe.setDepth(-43);
      this.add.graphics().fillStyle(COLORS.garden, 0.5).fillPoints(points, true).setDepth(-42);
    }
    const tufts: Point[] = [
      { x: 1_286, y: 1_042 },
      { x: 1_354, y: 1_010 },
      { x: 1_430, y: 1_015 },
      { x: 1_790, y: 1_015 },
      { x: 1_858, y: 1_047 },
      { x: 1_914, y: 1_080 },
      { x: 1_290, y: 1_420 },
      { x: 1_355, y: 1_470 },
      { x: 1_812, y: 1_486 },
      { x: 1_884, y: 1_430 },
    ];
    for (const tuft of tufts) {
      this.add.ellipse(tuft.x, tuft.y, 26, 12, COLORS.deepGrass, 0.6).setDepth(-41);
      this.add.triangle(tuft.x, tuft.y - 7, -9, 5, 0, -17, 8, 5, COLORS.deepGrass).setDepth(-40);
    }
    for (const point of SPATIAL_PREVIEW.planters) this.#addPlanter(point);
    this.#drawBench(1_260, 1_255);
    this.#drawBench(1_955, 1_255);
  }

  #addPlanter(point: Point) {
    if (this.textures.exists("prop/planter")) {
      this.add
        .image(point.x - 24, point.y - 56, "prop/planter")
        .setOrigin(0)
        .setDepth(point.y);
    } else {
      this.add.ellipse(point.x, point.y, 35, 10, COLORS.ink, 0.12).setDepth(point.y - 0.03);
      this.add.ellipse(point.x, point.y - 24, 35, 43, COLORS.teal).setDepth(point.y);
    }
  }

  #drawBench(x: number, y: number) {
    this.add.ellipse(x, y + 4, 81, 18, COLORS.ink, 0.16).setDepth(y - 0.03);
    this.add.rectangle(x, y - 10, 77, 12, COLORS.timber).setDepth(y);
    this.add.rectangle(x, y - 25, 77, 8, COLORS.timber).setDepth(y + 0.01);
    this.add.rectangle(x - 29, y, 6, 15, COLORS.ink).setDepth(y - 0.01);
    this.add.rectangle(x + 29, y, 6, 15, COLORS.ink).setDepth(y - 0.01);
  }

  #drawPlots() {
    for (const plot of SPATIAL_PREVIEW.plots) {
      const art = ASSET_BY_KEY.get(plot.assetKey)?.runtime;
      if (plot.status === "coming-soon") {
        this.#drawConstruction(plot.anchor);
      } else if (art?.anchor && this.textures.exists(plot.assetKey)) {
        this.add
          .image(plot.anchor.x - art.anchor.x, plot.anchor.y - art.anchor.y, plot.assetKey)
          .setOrigin(0)
          .setDepth(plot.anchor.y);
      } else {
        this.add
          .ellipse(plot.anchor.x, plot.anchor.y, 180, 22, COLORS.ink, 0.1)
          .setDepth(plot.anchor.y - 0.1);
        this.add
          .rectangle(plot.anchor.x, plot.anchor.y - 100, 260, 190, COLORS.coral)
          .setDepth(plot.anchor.y);
      }
      const footprint = plot.footprint;
      const obstacle = this.add
        .rectangle(
          footprint.x + footprint.width / 2,
          footprint.y + footprint.height / 2,
          footprint.width,
          footprint.height,
          COLORS.ink,
          0,
        )
        .setVisible(false);
      this.physics.add.existing(obstacle, true);
      this.registry.set(`obstacle-${plot.id}`, obstacle);
    }
  }

  #drawConstruction(anchor: Point) {
    const x = anchor.x;
    const y = anchor.y;
    this.add
      .polygon(x, y - 115, [-125, 0, 0, -80, 125, 0], COLORS.cream)
      .setStrokeStyle(5, COLORS.coral)
      .setDepth(y);
    this.add.rectangle(x - 105, y - 55, 15, 112, COLORS.timber).setDepth(y + 0.01);
    this.add.rectangle(x + 105, y - 55, 15, 112, COLORS.timber).setDepth(y + 0.01);
    this.add.rectangle(x, y - 55, 222, 10, COLORS.timber).setDepth(y + 0.02);
    this.add.rectangle(x, y - 5, 235, 21, COLORS.coral).setDepth(y + 0.03);
    this.add
      .text(x, y - 6, "Under construction", {
        fontFamily: '"Trebuchet MS", sans-serif',
        fontSize: "18px",
        fontStyle: "bold",
        color: "#f8f4e9",
      })
      .setOrigin(0.5)
      .setDepth(y + 0.04);
  }

  #drawFountain() {
    const fountain = SPATIAL_PREVIEW.fountain;
    const art = ASSET_BY_KEY.get("attraction/fountain/base")?.runtime;
    if (art?.anchor && this.textures.exists("attraction/fountain/base")) {
      this.add
        .image(fountain.x - art.anchor.x, fountain.y - art.anchor.y, "attraction/fountain/base")
        .setOrigin(0)
        .setDepth(fountain.y);
    } else {
      this.add.ellipse(fountain.x, fountain.y - 55, 350, 130, COLORS.teal).setDepth(fountain.y);
    }
    const footprint = fountain.footprint;
    const obstacle = this.add
      .rectangle(
        footprint.x + footprint.width / 2,
        footprint.y + footprint.height / 2,
        footprint.width,
        footprint.height,
        COLORS.ink,
        0,
      )
      .setVisible(false);
    this.physics.add.existing(obstacle, true);
    this.registry.set("obstacle-fountain", obstacle);
  }

  #drawPlayer() {
    const spawn = SPATIAL_PREVIEW.spawn;
    this.#player = this.textures.exists("player/walk")
      ? this.add.sprite(spawn.x, spawn.y, "player/walk", 0)
      : this.add.rectangle(spawn.x, spawn.y, PLAYER_WIDTH, PLAYER_HEIGHT, COLORS.ink);
    this.#player.setOrigin(0.5);
    this.#shadow = this.add.ellipse(spawn.x, spawn.y + 18, 23, 8, COLORS.ink, 0.16);
    this.physics.add.existing(this.#player);
    const body = this.#player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT, false);
    body.setOffset(PLAYER_BODY_OFFSET_X, PLAYER_BODY_OFFSET_Y);
    for (const plot of SPATIAL_PREVIEW.plots) {
      const obstacle = this.registry.get(`obstacle-${plot.id}`) as Phaser.GameObjects.Rectangle;
      this.physics.add.collider(this.#player, obstacle);
    }
    this.physics.add.collider(
      this.#player,
      this.registry.get("obstacle-fountain") as Phaser.GameObjects.Rectangle,
    );
  }

  update(time: number) {
    if (!this.#ready) return;
    const intent = this.#keyboard.getIntent();
    const velocity = getMovementVelocity(intent, 220);
    const body = this.#player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(velocity.x, velocity.y);
    const reducedMotion = this.#motionMedia.matches || this.#savedReduction;
    const art = getPlayerArtFrame(velocity, this.#facing, reducedMotion, time);
    this.#facing = art.facing;
    if (this.#player instanceof Phaser.GameObjects.Sprite) this.#player.setFrame(art.frame);
    this.#player.setDepth(body.bottom);
    this.#shadow.setPosition(body.center.x, body.bottom).setDepth(body.bottom - 0.03);
    const near = SPATIAL_PREVIEW.plots.find(
      (plot) =>
        Phaser.Math.Distance.Between(
          this.#player.x,
          this.#player.y,
          plot.approach.x,
          plot.approach.y,
        ) < 105,
    );
    if ((near?.id ?? null) !== this.#nearbyPlot) {
      this.#nearbyPlot = near?.id ?? null;
      if (near)
        this.#onStatus(
          `${near.name}. ${near.status === "available" ? "Demo entrance in the full fairground." : "This plot is not open yet."}`,
        );
      else this.#onStatus("Follow the clay paths to another part of the fairground.");
    }
  }

  readonly #dragCamera = (pointer: Phaser.Input.Pointer) => {
    if (!pointer.isDown) return;
    const dx = pointer.position.x - pointer.prevPosition.x;
    const dy = pointer.position.y - pointer.prevPosition.y;
    if (dx === 0 && dy === 0) return;
    this.#manualCamera = true;
    const camera = this.cameras.main;
    camera.stopFollow();
    camera.setScroll(camera.scrollX - dx / camera.zoom, camera.scrollY - dy / camera.zoom);
  };

  returnToPlayer() {
    if (!this.#ready) return;
    this.#manualCamera = false;
    this.cameras.main.startFollow(this.#player, false);
    this.cameras.main.setFollowOffset(0, 130);
    this.#onStatus("Following player. Walk with Arrow keys or WASD.");
  }

  zoomBy(factor: number) {
    if (!this.#ready) return;
    const zoom = Phaser.Math.Clamp(this.cameras.main.zoom * factor, 0.55, 1.45);
    this.cameras.main.setZoom(zoom);
    this.#onZoom(zoom);
  }

  get manualCamera() {
    return this.#manualCamera;
  }
}

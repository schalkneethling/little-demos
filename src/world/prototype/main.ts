import Phaser from "phaser";
import { KeyboardInput } from "../input/keyboard-input";
import { SPATIAL_PREVIEW } from "./layout";
import { SpatialPreviewScene } from "./scene";
import "./preview.css";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing spatial preview control: ${selector}`);
  return element;
}

const canvasHost = required<HTMLElement>("[data-canvas]");
const control = required<HTMLElement>("[data-world-control]");
const status = required<HTMLElement>("[data-status]");
const explore = required<HTMLButtonElement>("[data-explore]");
const returnButton = required<HTMLButtonElement>("[data-return]");
const zoomOut = required<HTMLButtonElement>("[data-zoom-out]");
const zoomIn = required<HTMLButtonElement>("[data-zoom-in]");
const zoomOutput = required<HTMLOutputElement>("[data-zoom]");
const mapHost = required<HTMLElement>("[data-plan-map]");
const routeList = required<HTMLUListElement>("[data-route-list]");

explore.disabled = true;
const keyboard = new KeyboardInput(control, "arrows-and-wasd");
const scene = new SpatialPreviewScene(
  keyboard,
  (message) => {
    status.textContent = message;
    if (message.startsWith("Preview ready")) explore.disabled = false;
  },
  (zoom) => {
    zoomOutput.value = `${Math.round(zoom * 100)}%`;
  },
);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: canvasHost,
  backgroundColor: "#91b77e",
  physics: { default: "arcade", arcade: { debug: false, fixedStep: false } },
  scale: { mode: Phaser.Scale.RESIZE, width: 960, height: 640 },
  scene,
});

explore.addEventListener("click", () => {
  control.focus();
  keyboard.activate();
  status.textContent = "Walking. Use Arrow keys or WASD; Escape stops controls.";
});
returnButton.addEventListener("click", () => scene.returnToPlayer());
zoomOut.addEventListener("click", () => scene.zoomBy(1 / 1.15));
zoomIn.addEventListener("click", () => scene.zoomBy(1.15));
control.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  keyboard.deactivate();
  control.blur();
  status.textContent = "Walking stopped. Choose Explore to continue.";
});
control.addEventListener("focusout", () => keyboard.deactivate());
window.addEventListener("blur", () => {
  keyboard.deactivate();
  status.textContent = "Walking stopped. Choose Explore to continue.";
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") return;
  keyboard.deactivate();
  status.textContent = "Walking stopped. Choose Explore to continue.";
});
window.addEventListener("pagehide", (event) => {
  keyboard.deactivate();
  if (event.persisted) return;
  keyboard.destroy();
  game.destroy(true);
});

function drawCirculationPlan() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  canvas.setAttribute("role", "presentation");
  mapHost.append(canvas);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(0.2, 0.2);
  context.fillStyle = "#91b77e";
  context.fillRect(0, 0, SPATIAL_PREVIEW.width, SPATIAL_PREVIEW.height);
  context.fillStyle = "#e5d3a2";
  context.strokeStyle = "#c4a77e";
  context.lineWidth = 9;
  for (const path of SPATIAL_PREVIEW.paths) {
    context.beginPath();
    path.points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fill();
    context.stroke();
  }
  context.fillStyle = "#31777a";
  context.beginPath();
  context.arc(SPATIAL_PREVIEW.fountain.x, SPATIAL_PREVIEW.fountain.y - 75, 125, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#bb4d42";
  for (const plot of SPATIAL_PREVIEW.plots) {
    context.fillStyle = plot.status === "coming-soon" ? "#987859" : "#bb4d42";
    context.fillRect(plot.anchor.x - 90, plot.anchor.y - 150, 180, 125);
    context.fillStyle = "#173449";
    context.beginPath();
    context.arc(plot.approach.x, plot.approach.y, 22, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f8f4e9";
    context.beginPath();
    context.arc(plot.exit.x, plot.exit.y, 15, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "#173449";
  context.beginPath();
  context.arc(SPATIAL_PREVIEW.spawn.x, SPATIAL_PREVIEW.spawn.y, 28, 0, Math.PI * 2);
  context.fill();
}

const stops = [
  ["arcade", "Southwest pavilion: approach from the southern promenade; exit back to it."],
  ["layer-cake", "Southeast pavilion: approach from the southern promenade; exit back to it."],
  ["ferris-wheel", "Northwest ride grove: approach from the northern loop; exit toward the loop."],
  ["carousel", "Northwest ride grove: approach from the northern loop; exit toward the loop."],
  [
    "property-transition",
    "Eastern pavilion: approach from the upper east spur; exit toward the east loop.",
  ],
  [
    "crisp-edges",
    "Eastern pavilion: approach from the lower east spur; exit toward the east loop.",
  ],
  [
    "funhouse",
    "Northeast construction: approach from a quieter spur; turn back to rejoin the east loop.",
  ],
] as const;

for (const [id, description] of stops) {
  const plot = SPATIAL_PREVIEW.plots.find((item) => item.id === id);
  if (!plot) throw new Error(`Missing circulation stop: ${id}`);
  const item = document.createElement("li");
  item.textContent = `${plot.name} — ${description}`;
  routeList.append(item);
}
drawCirculationPlan();

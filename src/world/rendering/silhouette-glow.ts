import type Phaser from "phaser";
import type { AttractionRenderPlan } from "./attraction-render-plan";

export const GLOW_PADDING = 24;

/** Canvas composition is shared by the Canvas and WebGL texture render paths. */
export function paintSilhouetteGlow(
  context: CanvasRenderingContext2D,
  mask: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  highContrast: boolean,
) {
  const outputWidth = width + GLOW_PADDING * 2;
  const outputHeight = height + GLOW_PADDING * 2;
  mask.clearRect(0, 0, outputWidth, outputHeight);
  mask.globalCompositeOperation = "source-over";
  mask.drawImage(source, GLOW_PADDING, GLOW_PADDING, width, height);
  // Fill only the existing alpha silhouette, not transparent image bounds.
  mask.globalCompositeOperation = "source-in";
  mask.fillStyle = highContrast ? "#ffffff" : "#ffdf88";
  mask.fillRect(0, 0, outputWidth, outputHeight);
  mask.globalCompositeOperation = "source-over";

  context.clearRect(0, 0, outputWidth, outputHeight);
  context.globalCompositeOperation = "source-over";
  context.shadowColor = highContrast ? "#ffffff" : "#ffdf88";
  context.shadowBlur = highContrast ? 10 : 14;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.drawImage(mask.canvas, 0, 0);
  context.shadowBlur = 0;
  context.shadowColor = "rgba(0,0,0,0)";
  // Remove the core silhouette and retain its soft outside light.
  context.globalCompositeOperation = "destination-out";
  context.drawImage(mask.canvas, 0, 0);
  context.globalCompositeOperation = "source-over";
}

export function createSilhouetteGlow(
  textures: Phaser.Textures.TextureManager,
  art: NonNullable<AttractionRenderPlan["artwork"]>,
) {
  // Derived effects have their own allocation bound, independent of source files.
  if (
    !Number.isInteger(art.width) ||
    !Number.isInteger(art.height) ||
    art.width <= 0 ||
    art.height <= 0 ||
    art.width > 1024 ||
    art.height > 1024
  )
    return null;
  const keys = { warm: `${art.key}/glow-warm`, contrast: `${art.key}/glow-contrast` };
  const source = textures.get(art.key).getSourceImage() as CanvasImageSource;
  const canvas = document.createElement("canvas");
  canvas.width = art.width + GLOW_PADDING * 2;
  canvas.height = art.height + GLOW_PADDING * 2;
  const mask = canvas.getContext("2d");
  if (!mask) return null;
  for (const [key, highContrast] of [
    [keys.warm, false],
    [keys.contrast, true],
  ] as const) {
    if (textures.exists(key)) continue;
    const texture = textures.createCanvas(key, canvas.width, canvas.height);
    if (!texture) return null;
    paintSilhouetteGlow(texture.getContext(), mask, source, art.width, art.height, highContrast);
    texture.refresh();
  }
  return keys;
}

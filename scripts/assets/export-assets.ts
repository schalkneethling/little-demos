import { createHash } from "node:crypto";
import { lstat, mkdir, open, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const KIB = 1024;
const MIB = KIB * KIB;
const MAX_TEXT_BYTES = 256 * KIB;
const MAX_SOURCE_BYTES = 64 * MIB;
const MAX_SOURCE_PIXELS = 16 * MIB;
const MAX_RUNTIME_BYTES = 2 * MIB;
const MAX_RUNTIME_DIMENSION = 2048;
const MAX_RUNTIME_DECODED_BYTES = 16 * MIB;
const MAX_SURFACE_DRAW_WORK = 1_000_000;
const MAX_BORDER_ALPHA = 8;
const READ_CHUNK_BYTES = 64 * KIB;
const MANIFEST_PATH = "src/assets/runtime/asset-manifest.ts";

export const DEFAULT_ASSET_BUDGETS = {
  proofTransferBytes: 600 * KIB,
  proofDecodedBytes: 16 * MIB,
  proofFiles: 10,
  initialTransferBytes: Math.floor(1.25 * MIB),
  initialDecodedBytes: 24 * MIB,
  initialFiles: 16,
  worldTransferBytes: 4 * MIB,
  worldDecodedBytes: 48 * MIB,
  worldFiles: 40,
} as const;

type AssetBudgets = { [Key in keyof typeof DEFAULT_ASSET_BUDGETS]: number };
type LoadGroup = "initial-world" | "deferred-world";
type Gravity = "center" | "south";

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface Rectangle extends Point, Size {}

interface ContentBox extends Rectangle {
  gravity: Gravity;
}

interface FrameGrid extends Size {
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  sourceRects: Rectangle[];
}

interface CommonSourceAsset {
  key: string;
  runtimePath: string;
  output: Size;
  loadGroup: LoadGroup;
  dependsOn: string[];
  fallback: Size & { color: string };
}

interface TransparentRasterSource extends CommonSourceAsset {
  kind: "transparent-raster";
  sourcePath: string;
  sourceRect?: Rectangle;
  contentBox: ContentBox;
  anchor: Point;
  frames?: FrameGrid;
}

interface DeterministicSurfaceSource extends CommonSourceAsset {
  kind: "deterministic-surface";
  recipePath: string;
  seed: number;
  alphaMode: "opaque-fill" | "transition-mask";
}

type SourceAsset = TransparentRasterSource | DeterministicSurfaceSource;

interface SpeckleRecipe {
  version: 1;
  algorithm: "speckle-v1";
  baseColor: string;
  fleckColors: string[];
  fleckCount: number;
  minRadius: number;
  maxRadius: number;
}

export interface RuntimeAssetDefinition {
  key: string;
  kind: SourceAsset["kind"];
  url: string;
  loadGroup: LoadGroup;
  width: number;
  height: number;
  anchor?: Point;
  frames?: Omit<FrameGrid, "sourceRects" | "width" | "height">;
  alphaMode?: DeterministicSurfaceSource["alphaMode"];
  dependsOn: string[];
  transferBytes: number;
  decodedBytes: number;
  outputSha256: string;
  pixelSha256: string;
  fallback: Size & { color: number };
}

export interface RuntimeAssetManifest {
  version: 1;
  assets: RuntimeAssetDefinition[];
  totals: {
    transferBytes: number;
    decodedBytes: number;
    files: number;
  };
}

function fail(message: string): never {
  throw new Error(`Asset validation failed: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`${label} must be an object`);
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a string`);
  return value;
}

function integer(value: unknown, label: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum)
    fail(`${label} must be an integer >= ${minimum}`);
  return value as number;
}

function positiveInteger(value: unknown, label: string): number {
  return integer(value, label, 1);
}

function size(value: unknown, label: string): Size {
  const item = record(value, label);
  return {
    width: positiveInteger(item.width, `${label}.width`),
    height: positiveInteger(item.height, `${label}.height`),
  };
}

function point(value: unknown, label: string): Point {
  const item = record(value, label);
  return {
    x: integer(item.x, `${label}.x`),
    y: integer(item.y, `${label}.y`),
  };
}

function rectangle(value: unknown, label: string): Rectangle {
  return { ...point(value, label), ...size(value, label) };
}

function color(value: unknown, label: string): string {
  const result = text(value, label).toLowerCase();
  if (!/^#[a-f\d]{6}$/.test(result)) fail(`${label} must use #rrggbb`);
  return result;
}

function colorNumber(value: string): number {
  return Number.parseInt(value.slice(1), 16);
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map((entry, index) => text(entry, `${label}[${index}]`));
}

function assertInside(container: Size, item: Rectangle, label: string) {
  if (item.x + item.width > container.width || item.y + item.height > container.height)
    fail(`${label} is outside ${container.width}x${container.height}`);
}

function repoPath(rootDir: string, value: unknown, label: string, prefix: string): string {
  const path = text(value, label);
  if (
    isAbsolute(path) ||
    path.includes("\\") ||
    path.includes("://") ||
    path.split("/").some((segment) => segment === ".." || segment === "." || segment === "") ||
    !path.startsWith(`${prefix}/`)
  )
    fail(`${label} must be a normalized repository path below ${prefix}`);
  const absolutePath = resolve(rootDir, path);
  const fromRoot = relative(resolve(rootDir), absolutePath);
  if (fromRoot.startsWith(`..${sep}`) || fromRoot === ".." || isAbsolute(fromRoot))
    fail(`${label} escapes the repository`);
  return path;
}

async function rejectSymlinkAncestors(rootDir: string, repositoryPath: string) {
  const segments = repositoryPath.split("/");
  let current = resolve(rootDir);
  for (const segment of segments) {
    current = resolve(current, segment);
    try {
      const information = await lstat(current);
      if (information.isSymbolicLink()) fail(`${repositoryPath} resolves through a symbolic link`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}

/** Preflight with lstat, then read in bounded chunks and retain a post-read size check. */
export async function readFileBounded(filePath: string, maxBytes: number): Promise<Buffer> {
  const before = await lstat(filePath);
  if (before.isSymbolicLink()) fail(`${filePath} is a symbolic link`);
  if (!before.isFile()) fail(`${filePath} is not a regular file`);
  if (before.size > maxBytes)
    fail(`${filePath} rejected before read: ${before.size} bytes exceeds ${maxBytes}`);

  const handle = await open(filePath, "r");
  try {
    const opened = await handle.stat();
    if (!opened.isFile()) fail(`${filePath} is not a regular file`);
    if (opened.size > maxBytes)
      fail(`${filePath} rejected before read: ${opened.size} bytes exceeds ${maxBytes}`);
    if (opened.dev !== before.dev || opened.ino !== before.ino)
      fail(`${filePath} changed between lstat and open`);

    const chunks: Buffer[] = [];
    let total = 0;
    while (true) {
      const chunk = Buffer.allocUnsafe(Math.min(READ_CHUNK_BYTES, maxBytes + 1 - total));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > maxBytes) fail(`${filePath} crossed the ${maxBytes}-byte read limit`);
      chunks.push(chunk.subarray(0, bytesRead));
    }
    const after = await handle.stat();
    if (after.size > maxBytes || total > maxBytes)
      fail(`${filePath} exceeds ${maxBytes} bytes after read`);
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size)
      fail(`${filePath} changed while being read`);
    const output = Buffer.concat(chunks, total);
    if (output.byteLength > maxBytes)
      fail(`${filePath} exceeds ${maxBytes} bytes after allocation`);
    return output;
  } finally {
    await handle.close();
  }
}

async function readRepositoryFile(
  rootDir: string,
  repositoryPath: string,
  maxBytes: number,
): Promise<Buffer> {
  await rejectSymlinkAncestors(rootDir, repositoryPath);
  return readFileBounded(resolve(rootDir, repositoryPath), maxBytes);
}

function parseJson(buffer: Buffer, label: string): unknown {
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${(error as Error).message}`);
  }
}

function parseCommon(rootDir: string, item: Record<string, unknown>, label: string) {
  const key = text(item.key, `${label}.key`);
  if (!/^(attraction|prop|player|surface|ui)\/[a-z\d]+(?:[/-][a-z\d]+)*$/.test(key))
    fail(`${label}.key is not a supported namespaced key: ${key}`);
  const output = size(item.output, `${label}.output`);
  if (output.width > MAX_RUNTIME_DIMENSION || output.height > MAX_RUNTIME_DIMENSION)
    fail(`${key} exceeds the ${MAX_RUNTIME_DIMENSION}px runtime dimension limit`);
  const decodedBytes = output.width * output.height * 4;
  if (decodedBytes > MAX_RUNTIME_DECODED_BYTES)
    fail(`${key} exceeds the ${MAX_RUNTIME_DECODED_BYTES}-byte decoded limit`);
  const loadGroup = text(item.loadGroup, `${label}.loadGroup`);
  if (loadGroup !== "initial-world" && loadGroup !== "deferred-world")
    fail(`${label}.loadGroup is invalid`);
  const fallbackValue = record(item.fallback, `${label}.fallback`);
  const runtimePath = repoPath(
    rootDir,
    item.runtimePath,
    `${label}.runtimePath`,
    "src/assets/runtime",
  );
  if (!/^src\/assets\/runtime\/(?:[a-z\d-]+\/)+[a-z\d-]+\.png$/.test(runtimePath))
    fail(`${label}.runtimePath must be a query-free .png path with kebab-case segments`);
  return {
    key,
    runtimePath,
    output,
    loadGroup,
    dependsOn: stringArray(item.dependsOn, `${label}.dependsOn`),
    fallback: {
      ...size(fallbackValue, `${label}.fallback`),
      color: color(fallbackValue.color, `${label}.fallback.color`),
    },
  } as const;
}

function parseInventory(rootDir: string, value: unknown): SourceAsset[] {
  const inventory = record(value, "inventory");
  if (inventory.version !== 1) fail("inventory.version must be 1");
  if (!Array.isArray(inventory.assets)) fail("inventory.assets must be an array");
  const assets = inventory.assets.map((value, index): SourceAsset => {
    const label = `inventory.assets[${index}]`;
    const item = record(value, label);
    const common = parseCommon(rootDir, item, label);
    if (item.kind === "transparent-raster") {
      const contentValue = record(item.contentBox, `${label}.contentBox`);
      const gravity = text(contentValue.gravity, `${label}.contentBox.gravity`);
      if (gravity !== "center" && gravity !== "south")
        fail(`${label}.contentBox.gravity must be center or south`);
      const contentBox = {
        ...rectangle(contentValue, `${label}.contentBox`),
        gravity,
      } as ContentBox;
      let frames: FrameGrid | undefined;
      if (item.frames !== undefined) {
        const frameValue = record(item.frames, `${label}.frames`);
        const columns = positiveInteger(frameValue.columns, `${label}.frames.columns`);
        const rows = positiveInteger(frameValue.rows, `${label}.frames.rows`);
        const frameWidth = positiveInteger(frameValue.frameWidth, `${label}.frames.frameWidth`);
        const frameHeight = positiveInteger(frameValue.frameHeight, `${label}.frames.frameHeight`);
        if (!Array.isArray(frameValue.sourceRects))
          fail(`${label}.frames.sourceRects must be an array`);
        if (frameValue.sourceRects.length !== columns * rows)
          fail(`${label}.frames.sourceRects must contain ${columns * rows} rectangles`);
        frames = {
          width: common.output.width,
          height: common.output.height,
          columns,
          rows,
          frameWidth,
          frameHeight,
          sourceRects: frameValue.sourceRects.map((entry, rectIndex) =>
            rectangle(entry, `${label}.frames.sourceRects[${rectIndex}]`),
          ),
        };
        if (
          columns * frameWidth !== common.output.width ||
          rows * frameHeight !== common.output.height
        )
          fail(`${common.key} frame grid does not equal output dimensions`);
        assertInside({ width: frameWidth, height: frameHeight }, contentBox, `${label}.contentBox`);
      } else {
        assertInside(common.output, contentBox, `${label}.contentBox`);
      }
      const anchor = point(item.anchor, `${label}.anchor`);
      const anchorBounds = frames
        ? { width: frames.frameWidth, height: frames.frameHeight }
        : common.output;
      if (anchor.x > anchorBounds.width || anchor.y > anchorBounds.height)
        fail(`${common.key} anchor is outside its ${frames ? "frame" : "output"}`);
      return {
        ...common,
        kind: "transparent-raster",
        sourcePath: repoPath(rootDir, item.sourcePath, `${label}.sourcePath`, "art/source"),
        sourceRect:
          item.sourceRect === undefined
            ? undefined
            : rectangle(item.sourceRect, `${label}.sourceRect`),
        contentBox,
        anchor,
        frames,
      };
    }
    if (item.kind === "deterministic-surface") {
      const alphaMode = text(item.alphaMode, `${label}.alphaMode`);
      if (alphaMode !== "opaque-fill" && alphaMode !== "transition-mask")
        fail(`${label}.alphaMode is invalid`);
      return {
        ...common,
        kind: "deterministic-surface",
        recipePath: repoPath(rootDir, item.recipePath, `${label}.recipePath`, "art/source"),
        seed: integer(item.seed, `${label}.seed`),
        alphaMode,
      };
    }
    fail(`${label}.kind is unsupported`);
  });

  const keyMap = new Map<string, SourceAsset>();
  const paths = new Set<string>();
  for (const asset of assets) {
    if (keyMap.has(asset.key)) fail(`duplicate asset key: ${asset.key}`);
    if (paths.has(asset.runtimePath)) fail(`duplicate runtimePath: ${asset.runtimePath}`);
    if (new Set(asset.dependsOn).size !== asset.dependsOn.length)
      fail(`${asset.key} has duplicate dependencies`);
    keyMap.set(asset.key, asset);
    paths.add(asset.runtimePath);
  }
  for (const asset of assets) {
    for (const dependencyKey of asset.dependsOn) {
      const dependency = keyMap.get(dependencyKey);
      if (!dependency) fail(`${asset.key} has missing dependency: ${dependencyKey}`);
      if (dependency === asset) fail(`${asset.key} cannot depend on itself`);
      if (asset.loadGroup === "initial-world" && dependency.loadGroup === "deferred-world")
        fail(`${asset.key} initial-world dependency is deferred: ${dependencyKey}`);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (asset: SourceAsset) => {
    if (visiting.has(asset.key)) fail(`dependency cycle includes ${asset.key}`);
    if (visited.has(asset.key)) return;
    visiting.add(asset.key);
    for (const key of asset.dependsOn) visit(keyMap.get(key)!);
    visiting.delete(asset.key);
    visited.add(asset.key);
  };
  for (const asset of assets) visit(asset);
  return assets.sort((first, second) => first.key.localeCompare(second.key));
}

function parseRecipe(value: unknown, label: string): SpeckleRecipe {
  const item = record(value, label);
  const supported = new Set([
    "version",
    "algorithm",
    "baseColor",
    "fleckColors",
    "fleckCount",
    "minRadius",
    "maxRadius",
  ]);
  for (const key of Object.keys(item)) if (!supported.has(key)) fail(`${label}.${key} is unknown`);
  if (item.version !== 1 || item.algorithm !== "speckle-v1")
    fail(`${label} must use version 1 and speckle-v1`);
  if (!Array.isArray(item.fleckColors) || item.fleckColors.length === 0)
    fail(`${label}.fleckColors must not be empty`);
  const minRadius = positiveInteger(item.minRadius, `${label}.minRadius`);
  const maxRadius = positiveInteger(item.maxRadius, `${label}.maxRadius`);
  if (minRadius > maxRadius) fail(`${label}.minRadius exceeds maxRadius`);
  return {
    version: 1,
    algorithm: "speckle-v1",
    baseColor: color(item.baseColor, `${label}.baseColor`),
    fleckColors: item.fleckColors.map((entry, index) =>
      color(entry, `${label}.fleckColors[${index}]`),
    ),
    fleckCount: integer(item.fleckCount, `${label}.fleckCount`),
    minRadius,
    maxRadius,
  };
}

function hash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function rgba(hex: string): [number, number, number, number] {
  const value = colorNumber(hex);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255];
}

function randomGenerator(seed: number) {
  let state = seed | 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function createSurfacePixels(recipe: SpeckleRecipe, seed: number, output: Size): Buffer {
  const periodWidth = output.width - 1;
  const periodHeight = output.height - 1;
  if (periodWidth < 2 || periodHeight < 2) fail("deterministic surfaces must be at least 3x3");
  if (recipe.maxRadius * 2 >= Math.min(periodWidth, periodHeight))
    fail("surface radius is too large for its repeat period");
  if (recipe.fleckCount > output.width * output.height)
    fail("surface fleckCount exceeds its pixel area");
  if (recipe.fleckCount * (recipe.maxRadius * 2 + 1) ** 2 > MAX_SURFACE_DRAW_WORK)
    fail(`surface recipe exceeds the ${MAX_SURFACE_DRAW_WORK}-operation draw-work cap`);
  const pixels = Buffer.alloc(output.width * output.height * 4);
  const base = rgba(recipe.baseColor);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels.set(base, offset);
  }
  const random = randomGenerator(seed);
  for (let mark = 0; mark < recipe.fleckCount; mark += 1) {
    const centerX = Math.floor(random() * periodWidth);
    const centerY = Math.floor(random() * periodHeight);
    const radius =
      recipe.minRadius + Math.floor(random() * (recipe.maxRadius - recipe.minRadius + 1));
    const markColor = rgba(recipe.fleckColors[Math.floor(random() * recipe.fleckColors.length)]!);
    for (let deltaY = -radius; deltaY <= radius; deltaY += 1) {
      for (let deltaX = -radius; deltaX <= radius; deltaX += 1) {
        if (deltaX * deltaX + deltaY * deltaY <= radius * radius) {
          const x = (centerX + deltaX + periodWidth) % periodWidth;
          const y = (centerY + deltaY + periodHeight) % periodHeight;
          pixels.set(markColor, (y * output.width + x) * 4);
        }
      }
    }
  }
  for (let y = 0; y < periodHeight; y += 1) {
    const first = y * output.width * 4;
    const last = (y * output.width + output.width - 1) * 4;
    pixels.copy(pixels, last, first, first + 4);
  }
  pixels.copy(pixels, (output.height - 1) * output.width * 4, 0, output.width * 4);
  return pixels;
}

async function containRaster(
  source: Buffer,
  sourceRect: Rectangle,
  box: ContentBox,
): Promise<Buffer> {
  return sharp(source, { limitInputPixels: MAX_SOURCE_PIXELS })
    .extract({
      left: sourceRect.x,
      top: sourceRect.y,
      width: sourceRect.width,
      height: sourceRect.height,
    })
    .resize({
      width: box.width,
      height: box.height,
      fit: "contain",
      position: box.gravity === "south" ? "south" : "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
}

async function validateSourceAlpha(source: Buffer, sourceRect: Rectangle, key: string) {
  const statistics = await sharp(source, { limitInputPixels: MAX_SOURCE_PIXELS })
    .extract({
      left: sourceRect.x,
      top: sourceRect.y,
      width: sourceRect.width,
      height: sourceRect.height,
    })
    .ensureAlpha()
    .stats();
  const alpha = statistics.channels[3];
  if (!alpha || alpha.min !== 0 || alpha.max === 0)
    fail(`${key} source crop must contain fully transparent and visible pixels`);
}

async function exportTransparent(
  rootDir: string,
  asset: TransparentRasterSource,
): Promise<{ png: Buffer; pixels: Buffer }> {
  const source = await readRepositoryFile(rootDir, asset.sourcePath, MAX_SOURCE_BYTES);
  const metadata = await sharp(source, { limitInputPixels: MAX_SOURCE_PIXELS }).metadata();
  if (!metadata.width || !metadata.height) fail(`${asset.key} source has no dimensions`);
  if (!metadata.hasAlpha) fail(`${asset.key} source must contain an alpha channel`);
  if (metadata.width * metadata.height > MAX_SOURCE_PIXELS)
    fail(`${asset.key} source exceeds the decoded pixel cap`);
  const sourceSize = { width: metadata.width, height: metadata.height };
  const canvas = sharp({
    create: {
      ...asset.output,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  if (asset.frames) {
    for (const [index, sourceRect] of asset.frames.sourceRects.entries()) {
      assertInside(sourceSize, sourceRect, `${asset.key} frame sourceRects[${index}]`);
      await validateSourceAlpha(source, sourceRect, `${asset.key} frame ${index}`);
      composites.push({
        input: await containRaster(source, sourceRect, asset.contentBox),
        left: (index % asset.frames.columns) * asset.frames.frameWidth + asset.contentBox.x,
        top:
          Math.floor(index / asset.frames.columns) * asset.frames.frameHeight + asset.contentBox.y,
      });
    }
  } else {
    if (!asset.sourceRect) fail(`${asset.key} requires sourceRect when frames are absent`);
    assertInside(sourceSize, asset.sourceRect, `${asset.key} sourceRect`);
    await validateSourceAlpha(source, asset.sourceRect, asset.key);
    composites.push({
      input: await containRaster(source, asset.sourceRect, asset.contentBox),
      left: asset.contentBox.x,
      top: asset.contentBox.y,
    });
  }
  const png = await canvas
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  const { data: pixels, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== asset.output.width || info.height !== asset.output.height)
    fail(`${asset.key} output dimensions changed during encode`);
  let transparent = false;
  let visible = false;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    transparent ||= pixels[offset]! < 255;
    visible ||= pixels[offset]! > 0;
  }
  if (!transparent || !visible) fail(`${asset.key} must contain transparent and visible pixels`);
  const frameWidth = asset.frames?.frameWidth ?? asset.output.width;
  const frameHeight = asset.frames?.frameHeight ?? asset.output.height;
  const columns = asset.frames?.columns ?? 1;
  const rows = asset.frames?.rows ?? 1;
  const alphaAt = (x: number, y: number) => pixels[(y * asset.output.width + x) * 4 + 3]!;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const left = column * frameWidth;
      const right = left + frameWidth - 1;
      const top = row * frameHeight;
      const bottom = top + frameHeight - 1;
      for (let x = left; x <= right; x += 1) {
        if (alphaAt(x, top) > MAX_BORDER_ALPHA || alphaAt(x, bottom) > MAX_BORDER_ALPHA)
          fail(
            `${asset.key} border alpha exceeds the ${MAX_BORDER_ALPHA}/255 transparent-border tolerance`,
          );
      }
      for (let y = top; y <= bottom; y += 1) {
        if (alphaAt(left, y) > MAX_BORDER_ALPHA || alphaAt(right, y) > MAX_BORDER_ALPHA)
          fail(
            `${asset.key} border alpha exceeds the ${MAX_BORDER_ALPHA}/255 transparent-border tolerance`,
          );
      }
    }
  }
  return { png, pixels };
}

async function exportSurface(
  rootDir: string,
  asset: DeterministicSurfaceSource,
): Promise<{ png: Buffer; pixels: Buffer }> {
  if (asset.alphaMode !== "opaque-fill")
    fail(`${asset.key} transition-mask has no approved PR2 recipe algorithm`);
  const recipeBuffer = await readRepositoryFile(rootDir, asset.recipePath, MAX_TEXT_BYTES);
  const recipe = parseRecipe(parseJson(recipeBuffer, asset.recipePath), asset.recipePath);
  const pixels = createSurfacePixels(recipe, asset.seed, asset.output);
  const png = await sharp(pixels, { raw: { ...asset.output, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  return { png, pixels };
}

function relativeAssetUrl(runtimePath: string): string {
  const path = relative(dirname(MANIFEST_PATH), runtimePath).split(sep).join("/");
  return `${path.startsWith(".") ? path : `./${path}`}?no-inline`;
}

function serializeManifest(manifest: RuntimeAssetManifest): string {
  const entries = manifest.assets.map((asset) => {
    const lines = [
      "    {",
      `      key: ${JSON.stringify(asset.key)},`,
      `      url: new URL(${JSON.stringify(asset.url)}, import.meta.url).href,`,
      `      kind: ${JSON.stringify(asset.kind)},`,
      `      loadGroup: ${JSON.stringify(asset.loadGroup)},`,
      `      width: ${asset.width},`,
      `      height: ${asset.height},`,
    ];
    if (asset.anchor)
      lines.push(
        "      anchor: {",
        `        x: ${asset.anchor.x},`,
        `        y: ${asset.anchor.y},`,
        "      },",
      );
    if (asset.frames)
      lines.push(
        "      frames: {",
        `        columns: ${asset.frames.columns},`,
        `        rows: ${asset.frames.rows},`,
        `        frameWidth: ${asset.frames.frameWidth},`,
        `        frameHeight: ${asset.frames.frameHeight},`,
        "      },",
      );
    if (asset.alphaMode) lines.push(`      alphaMode: ${JSON.stringify(asset.alphaMode)},`);
    lines.push(
      `      dependsOn: ${JSON.stringify(asset.dependsOn)},`,
      `      transferBytes: ${asset.transferBytes},`,
      `      decodedBytes: ${asset.decodedBytes},`,
      `      outputSha256: ${JSON.stringify(asset.outputSha256)},`,
      `      pixelSha256: ${JSON.stringify(asset.pixelSha256)},`,
      "      fallback: {",
      `        width: ${asset.fallback.width},`,
      `        height: ${asset.fallback.height},`,
      `        color: ${asset.fallback.color},`,
      "      },",
      "    },",
    );
    return lines.join("\n");
  });
  return [
    "// Generated by scripts/assets/export-assets.ts. Do not edit.",
    "export const RUNTIME_ASSET_MANIFEST = {",
    "  version: 1,",
    "  assets: [",
    entries.join("\n"),
    "  ],",
    `  totals: { transferBytes: ${manifest.totals.transferBytes}, decodedBytes: ${manifest.totals.decodedBytes}, files: ${manifest.totals.files} },`,
    "} as const;",
    "",
  ].join("\n");
}

function checkPreflightBudgets(assets: readonly SourceAsset[], budgets: AssetBudgets) {
  const decoded = (items: readonly SourceAsset[]) =>
    items.reduce((sum, asset) => sum + asset.output.width * asset.output.height * 4, 0);
  const initial = assets.filter((asset) => asset.loadGroup === "initial-world");
  const checks: Array<[number, number, string]> = [
    [decoded(assets), budgets.proofDecodedBytes, "proof decoded"],
    [assets.length, budgets.proofFiles, "proof file-count"],
    [decoded(initial), budgets.initialDecodedBytes, "initial decoded"],
    [initial.length, budgets.initialFiles, "initial file-count"],
    [decoded(assets), budgets.worldDecodedBytes, "world decoded"],
    [assets.length, budgets.worldFiles, "world file-count"],
  ];
  for (const [actual, limit, label] of checks)
    if (actual > limit) fail(`${label} budget exceeded before generation: ${actual} > ${limit}`);
}

function checkBudgets(
  assets: readonly RuntimeAssetDefinition[],
  budgets: AssetBudgets,
): RuntimeAssetManifest["totals"] {
  const total = (
    items: readonly RuntimeAssetDefinition[],
    field: "transferBytes" | "decodedBytes",
  ) => items.reduce((sum, asset) => sum + asset[field], 0);
  const initial = assets.filter((asset) => asset.loadGroup === "initial-world");
  const totals = {
    transferBytes: total(assets, "transferBytes"),
    decodedBytes: total(assets, "decodedBytes"),
    files: assets.length,
  };
  const checks: Array<[number, number, string]> = [
    [totals.transferBytes, budgets.proofTransferBytes, "proof transfer"],
    [totals.decodedBytes, budgets.proofDecodedBytes, "proof decoded"],
    [totals.files, budgets.proofFiles, "proof file-count"],
    [total(initial, "transferBytes"), budgets.initialTransferBytes, "initial transfer"],
    [total(initial, "decodedBytes"), budgets.initialDecodedBytes, "initial decoded"],
    [initial.length, budgets.initialFiles, "initial file-count"],
    [totals.transferBytes, budgets.worldTransferBytes, "world transfer"],
    [totals.decodedBytes, budgets.worldDecodedBytes, "world decoded"],
    [totals.files, budgets.worldFiles, "world file-count"],
  ];
  for (const [actual, limit, label] of checks)
    if (actual > limit) fail(`${label} budget exceeded: ${actual} > ${limit}`);
  return totals;
}

async function writeAtomically(path: string, contents: Buffer | string) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  try {
    await writeFile(temporaryPath, contents);
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function assertCurrent(
  path: string,
  expected: Buffer | string,
  maxBytes: number,
  label: string,
) {
  let actual: Buffer;
  try {
    actual = await readFileBounded(path, maxBytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      fail(`missing generated ${label}: ${path}`);
    throw error;
  }
  const expectedBuffer = typeof expected === "string" ? Buffer.from(expected) : expected;
  if (!actual.equals(expectedBuffer)) fail(`stale generated ${label}: ${path}`);
}

export async function exportAssetInventory(options: {
  rootDir: string;
  inventoryPath?: string;
  check?: boolean;
  budgets?: AssetBudgets;
}): Promise<RuntimeAssetManifest> {
  const rootDir = resolve(options.rootDir);
  const inventoryPath = repoPath(
    rootDir,
    options.inventoryPath ?? "art/source/inventory.json",
    "inventoryPath",
    "art/source",
  );
  const inventoryBuffer = await readRepositoryFile(rootDir, inventoryPath, MAX_TEXT_BYTES);
  const sourceAssets = parseInventory(rootDir, parseJson(inventoryBuffer, inventoryPath));
  const budgets = options.budgets ?? DEFAULT_ASSET_BUDGETS;
  checkPreflightBudgets(sourceAssets, budgets);
  for (const asset of sourceAssets) await rejectSymlinkAncestors(rootDir, asset.runtimePath);
  await rejectSymlinkAncestors(rootDir, MANIFEST_PATH);
  const generated: Array<{ source: SourceAsset; runtime: RuntimeAssetDefinition; png: Buffer }> =
    [];
  for (const asset of sourceAssets) {
    const { png, pixels } =
      asset.kind === "transparent-raster"
        ? await exportTransparent(rootDir, asset)
        : await exportSurface(rootDir, asset);
    if (png.byteLength > MAX_RUNTIME_BYTES)
      fail(`${asset.key} exceeds the ${MAX_RUNTIME_BYTES}-byte runtime transfer limit`);
    const frames =
      asset.kind === "transparent-raster" && asset.frames
        ? {
            columns: asset.frames.columns,
            rows: asset.frames.rows,
            frameWidth: asset.frames.frameWidth,
            frameHeight: asset.frames.frameHeight,
          }
        : undefined;
    generated.push({
      source: asset,
      png,
      runtime: {
        key: asset.key,
        kind: asset.kind,
        url: relativeAssetUrl(asset.runtimePath),
        loadGroup: asset.loadGroup,
        width: asset.output.width,
        height: asset.output.height,
        ...(asset.kind === "transparent-raster" ? { anchor: asset.anchor } : {}),
        ...(frames ? { frames } : {}),
        ...(asset.kind === "deterministic-surface" ? { alphaMode: asset.alphaMode } : {}),
        dependsOn: asset.dependsOn,
        transferBytes: png.byteLength,
        decodedBytes: pixels.byteLength,
        outputSha256: hash(png),
        pixelSha256: hash(pixels),
        fallback: { ...asset.fallback, color: colorNumber(asset.fallback.color) },
      },
    });
  }
  const assets = generated.map(({ runtime }) => runtime);
  const totals = checkBudgets(assets, budgets);
  const manifest = { version: 1, assets, totals } as RuntimeAssetManifest;
  const serialized = serializeManifest(manifest);
  if (Buffer.byteLength(serialized) > MAX_TEXT_BYTES) fail("generated manifest exceeds text cap");
  if (options.check) {
    for (const item of generated) {
      await assertCurrent(
        resolve(rootDir, item.source.runtimePath),
        item.png,
        MAX_RUNTIME_BYTES,
        `asset ${item.source.key}`,
      );
    }
    await assertCurrent(resolve(rootDir, MANIFEST_PATH), serialized, MAX_TEXT_BYTES, "manifest");
  } else {
    for (const item of generated)
      await writeAtomically(resolve(rootDir, item.source.runtimePath), item.png);
    await writeAtomically(resolve(rootDir, MANIFEST_PATH), serialized);
  }
  return manifest;
}

async function runCli() {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const check = process.argv.slice(2).includes("--check");
  const started = performance.now();
  const manifest = await exportAssetInventory({ rootDir, check });
  const durationMs = Math.round(performance.now() - started);
  const verb = check ? "Validated" : "Exported";
  process.stdout.write(
    `${verb} ${manifest.totals.files} assets: ${manifest.totals.transferBytes} transfer bytes, ${manifest.totals.decodedBytes} decoded bytes (${durationMs} ms).\n`,
  );
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  runCli().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

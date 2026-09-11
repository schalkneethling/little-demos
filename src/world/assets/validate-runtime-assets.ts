import type { AssetDefinition } from "./asset-types";
import { hasCompatiblePlayerGeometry } from "../rendering/player-art";

export function validateRuntimeAssets(assets: readonly AssetDefinition[]): string[] {
  const errors: string[] = [];
  const byKey = new Map(assets.map((asset) => [asset.key, asset]));
  const runtimeAssets = assets.filter((asset) => asset.runtime);
  if (runtimeAssets.length > 40) return ["Runtime asset count exceeds 40"];
  for (const { key, runtime: art } of runtimeAssets) {
    if (!art) continue;
    if (key === "player/walk" && !hasCompatiblePlayerGeometry(byKey.get(key)!)) {
      errors.push("Incompatible player artwork geometry: player/walk");
    }
    const positiveInteger = (value: number) => Number.isInteger(value) && value > 0;
    const sizeValid =
      positiveInteger(art.width) &&
      positiveInteger(art.height) &&
      art.width <= 2048 &&
      art.height <= 2048;
    if (
      !sizeValid ||
      !["transparent-raster", "deterministic-surface"].includes(art.kind) ||
      !["initial-world", "deferred-world"].includes(art.loadGroup) ||
      !art.url ||
      !positiveInteger(art.transferBytes) ||
      art.transferBytes > 2 * 1024 * 1024 ||
      art.decodedBytes !== art.width * art.height * 4 ||
      art.decodedBytes > 16 * 1024 * 1024 ||
      !/^[a-f0-9]{64}$/.test(art.outputSha256) ||
      !/^[a-f0-9]{64}$/.test(art.pixelSha256)
    ) {
      errors.push(`Invalid runtime asset metadata: ${key}`);
    }
    const frames = art.frames;
    if (
      frames &&
      (!positiveInteger(frames.columns) ||
        !positiveInteger(frames.rows) ||
        !positiveInteger(frames.frameWidth) ||
        !positiveInteger(frames.frameHeight) ||
        frames.columns * frames.frameWidth !== art.width ||
        frames.rows * frames.frameHeight !== art.height)
    ) {
      errors.push(`Invalid asset frames: ${key}`);
    }
    if (art.kind === "transparent-raster") {
      const anchor = art.anchor;
      if (
        !anchor ||
        !Number.isInteger(anchor.x) ||
        !Number.isInteger(anchor.y) ||
        anchor.x < 0 ||
        anchor.y < 0 ||
        anchor.x > (frames?.frameWidth ?? art.width) ||
        anchor.y > (frames?.frameHeight ?? art.height)
      )
        errors.push(`Invalid asset anchor: ${key}`);
    } else if (
      art.anchor ||
      frames ||
      !["opaque-fill", "transition-mask"].includes(art.alphaMode ?? "")
    ) {
      errors.push(`Invalid surface metadata: ${key}`);
    }
    if (new Set(art.dependsOn).size !== art.dependsOn.length)
      errors.push(`Duplicate asset dependency: ${key}`);
    for (const dependency of art.dependsOn) {
      const target = byKey.get(dependency)?.runtime;
      if (!target) errors.push(`Missing runtime asset dependency: ${key} -> ${dependency}`);
      else if (art.loadGroup === "initial-world" && target.loadGroup === "deferred-world") {
        errors.push(`Initial asset depends on deferred asset: ${key}`);
      }
    }
  }
  const complete = new Set<string>();
  const visiting = new Set<string>();
  function visit(key: string) {
    if (visiting.has(key)) {
      errors.push(`Cyclic asset dependency: ${key}`);
      return;
    }
    if (complete.has(key)) return;
    visiting.add(key);
    for (const dependency of byKey.get(key)?.runtime?.dependsOn ?? []) visit(dependency);
    visiting.delete(key);
    complete.add(key);
  }
  for (const asset of runtimeAssets) visit(asset.key);
  const initial = runtimeAssets.filter((asset) => asset.runtime?.loadGroup === "initial-world");
  const sum = (items: typeof runtimeAssets, field: "transferBytes" | "decodedBytes") =>
    items.reduce((total, asset) => total + (asset.runtime?.[field] ?? 0), 0);
  if (
    initial.length > 16 ||
    sum(initial, "transferBytes") > 1.25 * 1024 * 1024 ||
    sum(initial, "decodedBytes") > 24 * 1024 * 1024
  )
    errors.push("Initial runtime asset budget exceeded");
  if (
    sum(runtimeAssets, "transferBytes") > 4 * 1024 * 1024 ||
    sum(runtimeAssets, "decodedBytes") > 48 * 1024 * 1024
  )
    errors.push("Resident runtime asset budget exceeded");
  return errors;
}

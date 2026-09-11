export interface RuntimeArtDefinition {
  kind: "transparent-raster" | "deterministic-surface";
  url: string;
  width: number;
  height: number;
  anchor?: { x: number; y: number };
  frames?: { columns: number; rows: number; frameWidth: number; frameHeight: number };
  alphaMode?: "opaque-fill" | "transition-mask";
  loadGroup: "initial-world" | "deferred-world";
  dependsOn: readonly string[];
  transferBytes: number;
  decodedBytes: number;
  outputSha256: string;
  pixelSha256: string;
}

/** Pure rendering metadata; collision and interaction never depend on pixels. */
export interface AssetDefinition {
  key: string;
  placeholder: { width: number; height: number; color: number };
  runtime?: RuntimeArtDefinition;
}

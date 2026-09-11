import { RUNTIME_ASSET_MANIFEST } from "../../assets/runtime/asset-manifest";
import type { AssetDefinition } from "./asset-types";
export type { AssetDefinition } from "./asset-types";

export const ASSETS: readonly AssetDefinition[] = [
  { key: "arcade-placeholder", placeholder: { width: 300, height: 190, color: 0x6388b8 } },
  { key: "arcade-placeholder-selected", placeholder: { width: 300, height: 190, color: 0x6388b8 } },
  { key: "ferris-wheel-placeholder", placeholder: { width: 250, height: 230, color: 0xd86866 } },
  { key: "carousel-placeholder", placeholder: { width: 250, height: 230, color: 0xf0b85b } },
  { key: "funhouse-placeholder", placeholder: { width: 300, height: 190, color: 0x8a68a8 } },
  { key: "central-plaza-placeholder", placeholder: { width: 350, height: 340, color: 0x568b70 } },
  ...RUNTIME_ASSET_MANIFEST.assets.map(({ key, fallback, ...runtime }) => ({
    key,
    placeholder: fallback,
    runtime,
  })),
];

export const ASSET_BY_KEY: ReadonlyMap<string, AssetDefinition> = new Map(
  ASSETS.map((asset) => [asset.key, asset]),
);

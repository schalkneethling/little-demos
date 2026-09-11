import type { MovementVector } from "../player/player-movement";
import type { AssetDefinition } from "../assets/asset-types";
import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_GROUND_OFFSET_Y } from "../player/player-geometry";

export type PlayerFacing = "south" | "west" | "east" | "north";
const ROW: Record<PlayerFacing, number> = { south: 0, west: 1, east: 2, north: 3 };

/** This first sheet intentionally preserves the existing centered actor geometry. */
export function hasCompatiblePlayerGeometry(asset: AssetDefinition) {
  const art = asset.runtime;
  return (
    asset.placeholder.width === PLAYER_WIDTH &&
    asset.placeholder.height === PLAYER_HEIGHT &&
    art?.frames?.columns === 4 &&
    art.frames.rows === 4 &&
    art.frames.frameWidth === PLAYER_WIDTH &&
    art.frames.frameHeight === PLAYER_HEIGHT &&
    art.anchor?.x === PLAYER_WIDTH / 2 &&
    art.anchor.y === PLAYER_HEIGHT / 2 + PLAYER_GROUND_OFFSET_Y
  );
}

/** Four visual directions never change the underlying eight-direction velocity. */
export function getPlayerArtFrame(
  velocity: MovementVector,
  lastFacing: PlayerFacing,
  reducedMotion: boolean,
  elapsedMs: number,
) {
  const moving = velocity.x !== 0 || velocity.y !== 0;
  const facing: PlayerFacing = !moving
    ? lastFacing
    : Math.abs(velocity.x) >= Math.abs(velocity.y)
      ? velocity.x < 0
        ? "west"
        : "east"
      : velocity.y < 0
        ? "north"
        : "south";
  const column = moving && !reducedMotion ? 1 + (Math.floor(elapsedMs / 120) % 3) : 0;
  return { facing, frame: ROW[facing] * 4 + column };
}

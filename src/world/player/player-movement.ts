import type { MovementScheme } from "../../app/app-state";

export interface MovementVector {
  x: number;
  y: number;
}

function pressed(codes: ReadonlySet<string>, ...allowedCodes: string[]) {
  return allowedCodes.some((code) => codes.has(code));
}

export function getMovementIntent(
  codes: ReadonlySet<string>,
  scheme: MovementScheme,
): MovementVector {
  const arrowsEnabled = scheme !== "wasd-only";
  const wasdEnabled = scheme !== "arrows-only";
  const left =
    (arrowsEnabled && pressed(codes, "ArrowLeft")) || (wasdEnabled && pressed(codes, "KeyA"));
  const right =
    (arrowsEnabled && pressed(codes, "ArrowRight")) || (wasdEnabled && pressed(codes, "KeyD"));
  const up =
    (arrowsEnabled && pressed(codes, "ArrowUp")) || (wasdEnabled && pressed(codes, "KeyW"));
  const down =
    (arrowsEnabled && pressed(codes, "ArrowDown")) || (wasdEnabled && pressed(codes, "KeyS"));

  return {
    x: Number(right) - Number(left),
    y: Number(down) - Number(up),
  };
}

export function getMovementVelocity(
  intent: MovementVector,
  speed: number,
  controlsActive = true,
): MovementVector {
  if (!controlsActive) {
    return { x: 0, y: 0 };
  }

  const length = Math.hypot(intent.x, intent.y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (intent.x / length) * speed,
    y: (intent.y / length) * speed,
  };
}

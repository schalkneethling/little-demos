export function getVoidSafeCameraZoom(
  worldWidth: number,
  worldHeight: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (worldWidth <= 0 || worldHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return 1;
  }

  return Math.max(1, viewportWidth / worldWidth, viewportHeight / worldHeight);
}

export function getCameraFollowLerp(reducedMotion: boolean) {
  return reducedMotion ? 1 : 0.12;
}

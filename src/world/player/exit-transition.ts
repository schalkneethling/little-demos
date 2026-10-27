/** Owns completion separately from the tween so motion changes can settle safely. */
export function createExitTransition(stopTween: () => void, complete: () => void) {
  let settled = false;
  return {
    finish() {
      if (settled) return;
      settled = true;
      stopTween();
      complete();
    },
    cancel() {
      if (settled) return;
      settled = true;
      stopTween();
    },
  };
}

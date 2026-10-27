export function setupNavigation(
  slider: HTMLElement,
  signal: AbortSignal,
  initialReducedMotion: boolean,
  onReducedMotionChange: (listener: (reducedMotion: boolean) => void) => () => void,
) {
  const track = slider.querySelector<HTMLElement>(".cards-track")!;
  let reducedMotion = initialReducedMotion;
  const stopMotionSubscription = onReducedMotionChange((nextReducedMotion) => {
    reducedMotion = nextReducedMotion;
    if (reducedMotion) {
      track.scrollTo({ left: track.scrollLeft, top: track.scrollTop, behavior: "instant" });
    }
  });
  signal.addEventListener("abort", stopMotionSubscription, { once: true });
  for (const direction of ["previous", "next"] as const) {
    slider.querySelector(`[data-action="${direction}"]`)!.addEventListener(
      "click",
      () => {
        track.scrollBy({
          left: track.clientWidth * 0.85 * (direction === "previous" ? -1 : 1),
          behavior: reducedMotion ? "instant" : "smooth",
        });
      },
      { signal },
    );
  }
}

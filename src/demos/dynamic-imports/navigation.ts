export function setupNavigation(slider: HTMLElement, signal: AbortSignal, reducedMotion: boolean) {
  const track = slider.querySelector<HTMLElement>(".cards-track")!;
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

export function setupSliderNavigation(slider, track) {
  const previousButton = slider.querySelector('[data-action="previous"]');
  const nextButton = slider.querySelector('[data-action="next"]');

  if (!previousButton || !nextButton) {
    return;
  }

  const scrollAmount = () => track.clientWidth * 0.85;

  previousButton.addEventListener("click", () => {
    track.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
  });

  nextButton.addEventListener("click", () => {
    track.scrollBy({ left: scrollAmount(), behavior: "smooth" });
  });
}

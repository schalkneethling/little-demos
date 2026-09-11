class CardsSlider extends HTMLElement {
  async connectedCallback() {
    const track = this.querySelector(".cards-track");

    if (!track) {
      return;
    }

    // Only sliders that opt in with a data attribute load the navigation code.
    // This keeps the extra module out of the initial bundle/request path.
    if (this.hasAttribute("data-show-navigation")) {
      const { setupSliderNavigation } = await import("./slider-navigation.js");
      setupSliderNavigation(this, track);
    }
  }
}

customElements.define("cards-slider", CardsSlider);

class ContrastColorPlayground extends HTMLElement {
  static #selectors = {
    // Live Color Picker
    colorPicker: "#color-picker",
    colorTextInput: "#color-text-input",
    pickerPreview: "#picker-preview",
    pickerColorValue: "#picker-color-value",
    pickerContrastResult: "#picker-contrast-result",

    // Palette Generator
    paletteGrid: "#palette-grid",
    paletteBasePicker: "#palette-base-picker",
    paletteBaseText: "#palette-base-text",
    lightnessStep: "#lightness-step",
    lightnessStepValue: "#lightness-step-value",
    copyStatus: "#copy-status",

    // Icons
    iconsBgPicker: "#icons-bg-picker",
    iconsBgText: "#icons-bg-text",
    iconsPreview: "#icons-preview",

    // Tinting
    tintColorPicker: "#tint-color-picker",
    tintColorText: "#tint-color-text",
    tintSlider: "#tint-slider",
    tintValue: "#tint-value",
    tintPreviewPure: "#tint-preview-pure",
    tintPreviewMixed: "#tint-preview-mixed",
    tintCodeOutput: "#tint-code-output",

    // Style Queries
    styleQueryPicker: "#style-query-picker",
    styleQueryText: "#style-query-text",
    styleQueryContainer: "#style-query-container",

    // Card Builder
    cardBgPicker: "#card-bg-picker",
    cardBgText: "#card-bg-text",
    cardPreview: "#card-preview",
    cardCodeOutput: "#card-code-output",

    // Feature Detection
    detectionResult: "#detection-result",
    detectionIcon: "#detection-icon",
    detectionMessage: "#detection-message",

    // Unsupported Notice
    unsupportedNotice: "#unsupported-notice",
  };

  /** @type {Record<string, Element | null>} */
  #elements = {};

  /** @type {number | undefined} */
  #debounceTimeout;

  /** @type {number | undefined} */
  #copyResetTimeout;

  connectedCallback() {
    this.#elements = this.#getElements();
    this.#renderFeatureDetection();

    if (!CSS.supports("color", "contrast-color(red)")) {
      this.#showUnsupportedNotice();
      return;
    }

    this.#renderPaletteGrid();
    this.#addEventListeners();
  }

  disconnectedCallback() {
    if (this.#debounceTimeout) {
      clearTimeout(this.#debounceTimeout);
    }

    if (this.#copyResetTimeout) {
      clearTimeout(this.#copyResetTimeout);
    }
  }

  #getElements() {
    /** @type {Record<string, Element | null>} */
    const elements = {};
    const selectors = ContrastColorPlayground.#selectors;

    for (const [key, selector] of Object.entries(selectors)) {
      if (selector === "#unsupported-notice") {
        elements[key] = document.querySelector(selector);
      } else {
        elements[key] = this.querySelector(selector);
      }
    }

    return elements;
  }

  #showUnsupportedNotice() {
    const notice = this.#elements.unsupportedNotice;

    if (notice) {
      /** @type {HTMLElement} */ (notice).hidden = false;
    }

    this.hidden = true;
  }

  #renderFeatureDetection() {
    const { detectionResult, detectionIcon, detectionMessage } = this.#elements;
    const supported = CSS.supports("color", "contrast-color(red)");

    if (detectionResult && detectionIcon && detectionMessage) {
      if (supported) {
        detectionResult.classList.add("detection-result-supported");
        detectionIcon.textContent = "\u2714";
        detectionMessage.textContent =
          "Your browser supports contrast-color(). All playground features are active.";
      } else {
        detectionResult.classList.add("detection-result-unsupported");
        detectionIcon.textContent = "\u2718";
        detectionMessage.textContent = "Your browser does not support contrast-color() yet.";
      }
    }
  }

  /**
   * Generates the lightness ramp recipes based on the given step interval.
   * @param {number} step - Lightness step percentage (5–25)
   * @returns {Array<{label: string, css: string}>}
   */
  #generateLightnessRamp(step) {
    /** @type {Array<{label: string, css: string}>} */
    const ramp = [];
    let insertedBase = false;

    for (let pct = 95; pct >= 10; pct -= step) {
      if (!insertedBase && pct <= 50) {
        ramp.push({ label: "Base", css: "var(--base)" });
        insertedBase = true;
      }

      ramp.push({
        label: `${pct}%`,
        css: `oklch(from var(--base) ${pct}% c h)`,
      });
    }

    if (!insertedBase) {
      ramp.push({ label: "Base", css: "var(--base)" });
    }

    return ramp;
  }

  /** @param {number} [step=15] */
  #renderPaletteGrid(step = 15) {
    const { paletteGrid } = this.#elements;

    if (!paletteGrid) {
      return;
    }

    paletteGrid.textContent = "";

    const lightnessRamp = this.#generateLightnessRamp(step);
    const fragment = document.createDocumentFragment();

    for (const recipe of lightnessRamp) {
      fragment.appendChild(this.#createSwatch(recipe));
    }

    paletteGrid.appendChild(fragment);
  }

  /**
   * Creates a single palette swatch element.
   * @param {{label: string, css: string}} recipe
   * @returns {HTMLLIElement}
   */
  #createSwatch(recipe) {
    const li = document.createElement("li");
    li.classList.add("palette-swatch");
    li.dataset.css = recipe.css;
    li.dataset.label = recipe.label;
    li.style.setProperty("--swatch-color", recipe.css);

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("swatch-name");
    nameSpan.textContent = recipe.label;
    li.appendChild(nameSpan);

    const valueSpan = document.createElement("span");
    valueSpan.classList.add("swatch-value");
    valueSpan.textContent = recipe.css;
    li.appendChild(valueSpan);

    const copyButton = document.createElement("button");
    copyButton.classList.add("swatch-copy-button");
    copyButton.setAttribute("type", "button");
    copyButton.setAttribute("aria-label", `Copy CSS for ${recipe.label}`);

    const copyIconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    copyIconSvg.setAttribute("viewBox", "0 -960 960 960");
    copyIconSvg.setAttribute("aria-hidden", "true");
    copyIconSvg.classList.add("swatch-copy-icon");

    const copyIconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    copyIconPath.setAttribute("fill", "currentColor");
    copyIconPath.setAttribute(
      "d",
      "M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z",
    );
    copyIconSvg.appendChild(copyIconPath);
    copyButton.appendChild(copyIconSvg);

    li.appendChild(copyButton);

    return li;
  }

  #addEventListeners() {
    // Live Color Picker
    this.#addColorPairListeners(
      this.#elements.colorPicker,
      this.#elements.colorTextInput,
      (value) => this.#updatePickerPreview(value),
    );

    // Palette Generator — base color
    this.#addColorPairListeners(
      this.#elements.paletteBasePicker,
      this.#elements.paletteBaseText,
      (value) => this.#updatePaletteBase(value),
    );

    // Palette Generator — lightness step slider
    const { lightnessStep } = this.#elements;

    if (lightnessStep) {
      lightnessStep.addEventListener("input", () => {
        this.#updateLightnessStep();
      });
    }

    // Icons section
    this.#addColorPairListeners(this.#elements.iconsBgPicker, this.#elements.iconsBgText, (value) =>
      this.#updateIconsPreview(value),
    );

    // Tint section
    this.#addColorPairListeners(
      this.#elements.tintColorPicker,
      this.#elements.tintColorText,
      (value) => this.#updateTintPreview(value),
    );

    const { tintSlider } = this.#elements;

    if (tintSlider) {
      tintSlider.addEventListener("input", () => {
        this.#updateTintSlider();
      });
    }

    // Style Queries section
    this.#addColorPairListeners(
      this.#elements.styleQueryPicker,
      this.#elements.styleQueryText,
      (value) => this.#updateStyleQueryPreview(value),
    );

    // Card Builder
    this.#addColorPairListeners(this.#elements.cardBgPicker, this.#elements.cardBgText, (value) =>
      this.#updateCardPreview(value),
    );

    // Palette Grid — delegated click on copy buttons
    const { paletteGrid } = this.#elements;

    if (paletteGrid) {
      paletteGrid.addEventListener("click", (event) => {
        const button = /** @type {HTMLElement} */ (event.target).closest(".swatch-copy-button");

        if (button) {
          const swatch = /** @type {HTMLElement} */ (button).closest(".palette-swatch");

          if (swatch) {
            void this.#copySwatchValue(/** @type {HTMLElement} */ (swatch));
          }
        }
      });
    }
  }

  /** @param {string} value */
  #updatePaletteBase(value) {
    const { paletteGrid } = this.#elements;

    if (paletteGrid) {
      /** @type {HTMLElement} */ (paletteGrid).style.setProperty("--base", value);
    }
  }

  #updateLightnessStep() {
    const { lightnessStep, lightnessStepValue } = this.#elements;

    if (!lightnessStep) {
      return;
    }

    const step = Number(/** @type {HTMLInputElement} */ (lightnessStep).value);

    if (lightnessStepValue) {
      lightnessStepValue.textContent = String(step);
    }

    this.#renderPaletteGrid(step);
  }

  /** @param {string} color */
  #updateIconsPreview(color) {
    const { iconsPreview } = this.#elements;

    if (iconsPreview) {
      /** @type {HTMLElement} */ (iconsPreview).style.setProperty("--icons-bg", color);
    }
  }

  /**
   * Adds bidirectional sync listeners for a color picker + text input pair.
   * @param {Element | null} picker
   * @param {Element | null} textInput
   * @param {(value: string) => void} updateFn
   */
  #addColorPairListeners(picker, textInput, updateFn) {
    if (picker) {
      picker.addEventListener("input", (event) => {
        const value = /** @type {HTMLInputElement} */ (event.target).value;

        if (textInput) {
          /** @type {HTMLInputElement} */ (textInput).value = value;
        }

        this.#debounced(() => updateFn(value));
      });
    }

    if (textInput) {
      textInput.addEventListener("input", (event) => {
        const value = /** @type {HTMLInputElement} */ (event.target).value;

        if (picker && value.match(/^#[0-9a-f]{6}$/i)) {
          /** @type {HTMLInputElement} */ (picker).value = value;
        }

        this.#debounced(() => updateFn(value));
      });
    }
  }

  /**
   * @param {() => void} fn
   * @param {number} [delay=50]
   */
  #debounced(fn, delay = 50) {
    if (this.#debounceTimeout) {
      clearTimeout(this.#debounceTimeout);
    }

    this.#debounceTimeout = window.setTimeout(fn, delay);
  }

  /** @param {string} color */
  #updatePickerPreview(color) {
    const { pickerPreview, pickerColorValue, pickerContrastResult } = this.#elements;

    if (pickerPreview) {
      /** @type {HTMLElement} */ (pickerPreview).style.setProperty("--bg", color);
    }

    if (pickerColorValue) {
      pickerColorValue.textContent = color;
    }

    if (pickerContrastResult) {
      const contrastValue = this.#resolveContrastColor(pickerPreview);
      pickerContrastResult.textContent = contrastValue;
    }

    // Update the code snippet
    const codeSnippet = this.querySelector(".playground-section:first-of-type .code-snippet code");

    if (codeSnippet) {
      codeSnippet.innerHTML =
        `<span class="code-prop">background</span>: <span class="code-val">${this.#escapeHtml(color)}</span>;\n` +
        `<span class="code-prop">color</span>: <span class="code-fn">contrast-color</span>(<span class="code-val">${this.#escapeHtml(color)}</span>);`;
    }
  }

  /** @param {string} color */
  #updateTintPreview(color) {
    const { tintPreviewPure, tintPreviewMixed } = this.#elements;

    if (tintPreviewPure) {
      /** @type {HTMLElement} */ (tintPreviewPure).style.setProperty("--bg", color);
    }

    if (tintPreviewMixed) {
      /** @type {HTMLElement} */ (tintPreviewMixed).style.setProperty("--bg", color);
    }

    this.#updateTintCode(color);
  }

  #updateTintSlider() {
    const { tintSlider, tintValue, tintPreviewMixed } = this.#elements;

    if (!tintSlider) {
      return;
    }

    const pct = /** @type {HTMLInputElement} */ (tintSlider).value;

    if (tintValue) {
      tintValue.textContent = pct;
    }

    if (tintPreviewMixed) {
      /** @type {HTMLElement} */ (tintPreviewMixed).style.setProperty("--tint-pct", `${pct}%`);
    }

    const currentColor =
      /** @type {HTMLInputElement} */ (this.#elements.tintColorPicker)?.value || "#6c1afb";
    this.#updateTintCode(currentColor);
  }

  /** @param {string} color */
  #updateTintCode(color) {
    const { tintCodeOutput, tintSlider } = this.#elements;

    if (!tintCodeOutput) {
      return;
    }

    const pct = tintSlider ? /** @type {HTMLInputElement} */ (tintSlider).value : "15";
    const escaped = this.#escapeHtml(color);

    tintCodeOutput.innerHTML = `<span class="code-prop">color</span>: <span class="code-fn">color-mix</span>(in oklch, <span class="code-val">${escaped}</span> <span class="code-val">${pct}%</span>, <span class="code-fn">contrast-color</span>(<span class="code-val">${escaped}</span>));`;
  }

  /** @param {string} color */
  #updateStyleQueryPreview(color) {
    const { styleQueryContainer } = this.#elements;

    if (styleQueryContainer) {
      /** @type {HTMLElement} */ (styleQueryContainer).style.setProperty("--bg", color);
    }
  }

  /** @param {string} color */
  #updateCardPreview(color) {
    const { cardPreview, cardCodeOutput } = this.#elements;

    if (cardPreview) {
      /** @type {HTMLElement} */ (cardPreview).style.setProperty("--card-bg", color);
    }

    if (cardCodeOutput) {
      const escaped = this.#escapeHtml(color);

      cardCodeOutput.innerHTML =
        `<span class="code-sel">.card</span> {\n` +
        `  <span class="code-prop">--card-bg</span>: <span class="code-val">${escaped}</span>;\n` +
        `  <span class="code-prop">background</span>: <span class="code-val">var(--card-bg)</span>;\n` +
        `  <span class="code-prop">color</span>: <span class="code-fn">contrast-color</span>(<span class="code-val">var(--card-bg)</span>);\n` +
        `}\n\n` +
        `<span class="code-sel">.card-button</span> {\n` +
        `  <span class="code-prop">background</span>: <span class="code-fn">contrast-color</span>(<span class="code-val">var(--card-bg)</span>);\n` +
        `  <span class="code-prop">color</span>: <span class="code-val">var(--card-bg)</span>;\n` +
        `}`;
    }
  }

  /** @param {HTMLElement} swatch */
  async #copySwatchValue(swatch) {
    const cssExpr = swatch.dataset.css;
    const label = swatch.dataset.label || cssExpr;

    if (!cssExpr) {
      return;
    }

    const cssText = `background-color: ${cssExpr};\ncolor: contrast-color(${cssExpr});`;

    await navigator.clipboard.writeText(cssText);

    swatch.setAttribute("data-copied", "");

    const { copyStatus } = this.#elements;

    if (copyStatus) {
      copyStatus.textContent = `Copied CSS for ${label} to clipboard`;
    }

    if (this.#copyResetTimeout) {
      clearTimeout(this.#copyResetTimeout);
    }

    this.#copyResetTimeout = window.setTimeout(() => {
      swatch.removeAttribute("data-copied");

      if (copyStatus) {
        copyStatus.textContent = "";
      }
    }, 2000);
  }

  /**
   * Reads the computed color from a rendered element to determine
   * whether contrast-color() resolved to "white" or "black".
   * @param {Element | null} element
   * @returns {string}
   */
  #resolveContrastColor(element) {
    if (!element) {
      return "white";
    }

    // Force a layout so getComputedStyle returns the resolved value
    const computed = getComputedStyle(element).color;

    // The computed value will be an rgb() string.
    // rgb(255, 255, 255) = white, rgb(0, 0, 0) = black
    if (computed.includes("255")) {
      return "white";
    }

    return "black";
  }

  /**
   * @param {string} str
   * @returns {string}
   */
  #escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

customElements.define("contrast-color-playground", ContrastColorPlayground);

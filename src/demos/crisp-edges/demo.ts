import type { DemoModule } from "../demo-types";

const baseSize = 240;
const characterUrl = new URL("../../../crisp-edges/310a.png", import.meta.url).href;

function formatScale(scale: number): string {
  return Number.isInteger(scale) ? `${scale}×` : `${scale.toFixed(2).replace(/\.?0+$/, "")}×`;
}

export function createDemo(): DemoModule {
  let host: HTMLElement | undefined;

  return {
    mount(container, context) {
      host = document.createElement("div");
      host.toggleAttribute("data-reduced-motion", context.reducedMotion);
      container.append(host);
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          :host {
            --color-blue: #5aa9e6;
            --color-sky: #7fc8f8;
            --color-surface: #f9f9f9;
            --color-yellow: #ffe45e;
            --color-pink: #ff6392;
            --color-text: #1a2a3a;
            --color-text-muted: #3a5366;
            --color-blue-strong: #1e6fa8;
            --color-pink-strong: #a83862;
            color: var(--color-text);
            display: block;
            font-family: Arimo, ui-sans-serif, system-ui, sans-serif;
            line-height: 1.5;
          }
          *, *::before, *::after { box-sizing: border-box; }
          code { color: var(--color-pink-strong); font-size: .9em; font-weight: 600; }
          .demo-shell {
            background: var(--color-sky);
            border-radius: .75rem;
            padding-block: clamp(1.5rem, 4vw, 3rem) 3rem;
          }
          .demo__header, .demo {
            inline-size: min(100%, 60rem);
            margin-inline: auto;
            padding-inline: 1.5rem;
          }
          .demo__header { text-align: center; }
          .demo__header h3 {
            font-family: "Arial Narrow", ui-sans-serif, system-ui, sans-serif;
            font-size: clamp(2.5rem, 5vw, 3.35rem);
            line-height: 1.1;
            margin: 0 0 .5rem;
          }
          .demo__header p { margin: 0 auto; max-inline-size: 32ch; }
          .demo {
            align-items: stretch;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            padding-block-start: 2rem;
          }
          .demo__preview, .demo__controls {
            background: var(--color-surface);
            border-radius: .75rem;
            box-shadow: 0 .5rem 1.5rem rgb(26 42 58 / 12%);
            inline-size: 100%;
          }
          .demo__controls {
            border: 3px solid var(--color-yellow);
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            padding: 1.5rem;
          }
          .control {
            align-items: center;
            display: grid;
            gap: .75rem 1rem;
            grid-template-columns: auto 1fr auto;
          }
          .control:first-child { grid-template-columns: auto 1fr; }
          .control__label { cursor: pointer; }
          .control__checkbox {
            accent-color: var(--color-pink);
            block-size: 1.25rem;
            cursor: pointer;
            inline-size: 1.25rem;
            margin: 0;
          }
          .control__range {
            accent-color: var(--color-blue);
            cursor: pointer;
            inline-size: 100%;
            margin: 0;
          }
          .control__output {
            color: var(--color-blue-strong);
            font-size: 1.2rem;
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            min-inline-size: 3.25rem;
            text-align: end;
          }
          input:focus-visible {
            outline: 3px solid var(--color-text);
            outline-offset: 3px;
          }
          .demo__preview {
            align-items: center;
            border: 3px solid var(--color-blue);
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin: 0;
            overflow: auto;
            padding: 2rem 1.5rem;
          }
          .demo__stage {
            --character-size: 240px;
            block-size: var(--character-size);
            display: grid;
            flex: 0 0 auto;
            inline-size: var(--character-size);
            margin-inline: auto;
            place-items: center;
            transition: block-size 200ms ease-out, inline-size 200ms ease-out;
          }
          :host([data-reduced-motion]) .demo__stage { transition: none; }
          .demo__character {
            block-size: 100%;
            display: block;
            image-rendering: auto;
            inline-size: 100%;
          }
          .demo__character.is-crisp { image-rendering: crisp-edges; }
          .demo__size { color: var(--color-text-muted); margin: 0; }
          @media (prefers-reduced-motion: reduce) {
            .demo__stage { transition: none; }
          }
          @media (width <= 32rem) {
            .demo__header, .demo { padding-inline: .75rem; }
            .demo__controls, .demo__preview { padding-inline: 1rem; }
          }
        </style>
        <section class="demo-shell" aria-labelledby="crisp-heading">
          <header class="demo__header">
            <h3 id="crisp-heading">crisp pixel art</h3>
            <p>Scale a pixel-art sprite and compare default smoothing with crisp edge rendering.</p>
          </header>
          <div class="demo">
            <form class="demo__controls" aria-label="Rendering controls">
              <div class="control">
                <input type="checkbox" id="crisp-edges" name="crisp-edges" class="control__checkbox">
                <label for="crisp-edges" class="control__label">Enable <code>image-rendering: crisp-edges</code></label>
              </div>
              <div class="control">
                <label for="scale" class="control__label">Scale</label>
                <input type="range" id="scale" name="scale" class="control__range" min="1" max="4" step="0.25" value="1">
                <output for="scale" id="scale-value" class="control__output">1×</output>
              </div>
            </form>
            <figure class="demo__preview">
              <div class="demo__stage">
                <img id="character" class="demo__character" src="${characterUrl}" width="240" height="240" alt="Pixel-art character sprite">
              </div>
              <figcaption class="demo__size" id="size-label" aria-live="polite">240 × 240 px (1×)</figcaption>
            </figure>
          </div>
        </section>`;

      const form = root.querySelector<HTMLFormElement>("form")!;
      const stage = root.querySelector<HTMLElement>(".demo__stage")!;
      const character = root.querySelector<HTMLImageElement>("#character")!;
      const crispCheckbox = root.querySelector<HTMLInputElement>("#crisp-edges")!;
      const scaleInput = root.querySelector<HTMLInputElement>("#scale")!;
      const scaleValue = root.querySelector<HTMLOutputElement>("#scale-value")!;
      const sizeLabel = root.querySelector<HTMLElement>("#size-label")!;

      const applyScale = () => {
        const scale = Number(scaleInput.value);
        const size = baseSize * scale;
        const label = formatScale(scale);
        stage.style.setProperty("--character-size", `${size}px`);
        scaleValue.textContent = label;
        sizeLabel.textContent = `${Math.round(size)} × ${Math.round(size)} px (${label})`;
      };
      const applyCrispEdges = () => {
        character.classList.toggle("is-crisp", crispCheckbox.checked);
      };

      form.addEventListener("submit", (event) => event.preventDefault(), {
        signal: context.signal,
      });
      crispCheckbox.addEventListener("change", applyCrispEdges, { signal: context.signal });
      scaleInput.addEventListener("input", applyScale, { signal: context.signal });
      applyScale();
      applyCrispEdges();
    },
    unmount() {
      host?.remove();
      host = undefined;
    },
  };
}

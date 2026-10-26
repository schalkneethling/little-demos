import type { DemoModule } from "../demo-types";

const pizzaImages = {
  basil: new URL("../../../accent-color/media/basil-exposition.png", import.meta.url).href,
  chocolate: new URL("../../../accent-color/media/chocoholic.png", import.meta.url).href,
  garlic: new URL("../../../accent-color/media/dracula-nightmare.png", import.meta.url).href,
  pepperoni: new URL("../../../accent-color/media/peppahog.png", import.meta.url).href,
} as const;

export function createDemo(): DemoModule {
  let host: HTMLElement | undefined;

  return {
    mount(container, context) {
      host = document.createElement("div");
      container.append(host);
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          :host {
            --color-canvas: #eef4ec;
            --color-ink: #0b0b0b;
            --color-surface: #f8f8f8;
            --color-surface-border: #d8e2d5;
            color: var(--color-ink);
            color-scheme: light;
            display: block;
            font-family: Inter, ui-sans-serif, system-ui, sans-serif;
            line-height: 1.4;
          }
          *, *::before, *::after { box-sizing: border-box; }
          button, input { font: inherit; }
          button, label { cursor: pointer; }
          .pizza-demo {
            background: var(--color-canvas);
            border: .0625rem solid var(--color-surface-border);
            border-radius: .75rem;
            padding: clamp(1rem, 3vw, 2rem);
          }
          .pizza-form {
            accent-color: var(--theme-color);
            inline-size: min(100%, 56rem);
            margin-inline: auto;
          }
          .pizza-form-header {
            align-items: end;
            display: grid;
            gap: 1rem;
            grid-template-columns: 1fr auto;
            margin-block-end: 1.5rem;
          }
          h3, legend, .pan-depth > label, button {
            font-weight: 900;
            line-height: 1;
          }
          h3 { font-size: clamp(2.25rem, 8vw, 3.75rem); margin: 0; }
          fieldset { border: 0; margin: 0; min-inline-size: 0; padding: 0; }
          .theme-picker {
            align-items: center;
            display: flex;
            font-weight: 500;
            gap: .75rem;
            line-height: 1;
            min-block-size: 3rem;
            place-self: start end;
          }
          .theme-picker input {
            appearance: none;
            background: transparent;
            block-size: 2.5rem;
            border: 0;
            inline-size: 2.5rem;
            padding: 0;
          }
          .theme-picker input::-webkit-color-swatch-wrapper { padding: 0; }
          .theme-picker input::-webkit-color-swatch,
          .theme-picker input::-moz-color-swatch { border: .25rem solid #fff; }
          .pizza-options legend { font-size: clamp(1.75rem, 5vw, 2.625rem); }
          .pizza-toppings legend {
            block-size: 1px;
            clip-path: inset(50%);
            inline-size: 1px;
            overflow: hidden;
            position: absolute;
            white-space: nowrap;
          }
          .pizza-toppings {
            display: grid;
            gap: clamp(1rem, 3vw, 2.25rem);
            grid-template-columns: repeat(4, minmax(0, 1fr));
            margin-block-end: clamp(2rem, 5vw, 3.25rem);
          }
          .pizza-card { display: grid; gap: .75rem; margin: 0; min-inline-size: 0; }
          .pizza-card img {
            aspect-ratio: 590 / 420;
            background: var(--color-surface);
            block-size: auto;
            border: .0625rem solid var(--color-surface-border);
            display: block;
            inline-size: 100%;
            object-fit: contain;
          }
          .pizza-card-choice, .base-options label {
            align-items: center;
            display: flex;
            font-size: .875rem;
            gap: .5rem;
          }
          .pizza-card input, .base-options input {
            block-size: 1rem;
            flex: 0 0 auto;
            inline-size: 1rem;
            margin: 0;
          }
          .pizza-base, .pan-depth {
            background: #fff;
            border: .0625rem solid var(--color-surface-border);
            border-radius: .375rem;
            padding: 1.5rem;
          }
          .pizza-base { margin-block-end: clamp(2rem, 5vw, 2.75rem); }
          .pizza-base legend {
            float: inline-start;
            inline-size: 100%;
            margin-block-end: 1.25rem;
          }
          .base-options {
            clear: both;
            display: flex;
            flex-wrap: wrap;
            gap: 1rem clamp(3rem, 12vw, 8rem);
          }
          .pan-depth { inline-size: 100%; margin-block-end: 2rem; }
          .pan-depth > label {
            display: block;
            font-size: clamp(1.75rem, 5vw, 2.625rem);
            margin-block-end: 1.25rem;
          }
          .pan-depth input { inline-size: 100%; margin: 0; }
          .pan-depth-labels {
            display: flex;
            font-weight: 500;
            justify-content: space-between;
            margin-block-start: .75rem;
          }
          button {
            background-color: ButtonFace;
            border: .125rem solid ButtonBorder;
            border-radius: .375rem;
            color: ButtonText;
            font-size: clamp(1.25rem, 4vw, 1.75rem);
            min-block-size: 3rem;
            padding: .625rem 1.5rem;
          }
          button:focus-visible, input:focus-visible {
            outline: .1875rem solid var(--color-ink);
            outline-offset: .1875rem;
          }
          .pizza-order-status { display: block; font-weight: 600; margin-block-start: 1rem; }
          .pizza-order-status:empty { display: none; }
          @media (width <= 48rem) {
            .pizza-form-header { align-items: start; grid-template-columns: 1fr; }
            .theme-picker { justify-self: start; }
            .pizza-toppings { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (width <= 32rem) {
            .pizza-toppings { grid-template-columns: 1fr; }
            .base-options { display: grid; }
          }
        </style>
        <div class="pizza-demo">
          <form class="pizza-form" aria-labelledby="pizza-heading">
            <div class="pizza-form-header">
              <h3 id="pizza-heading">The Pizza</h3>
              <label class="theme-picker" for="theme-color">
                <input type="color" id="theme-color" name="theme-color" value="#efefef">
                <span>Your theme</span>
              </label>
            </div>
            <fieldset class="pizza-options pizza-toppings">
              <legend>Toppings</legend>
              <figure class="pizza-card">
                <img src="${pizzaImages.chocolate}" width="590" height="420" alt="Chocolate dessert pizza slice">
                <figcaption class="pizza-card-choice"><input type="checkbox" id="chocoholic" name="toppings" value="Chocoholic"><label for="chocoholic">Chocoholic</label></figcaption>
              </figure>
              <figure class="pizza-card">
                <img src="${pizzaImages.pepperoni}" width="590" height="420" alt="Pepperoni pizza slice">
                <figcaption class="pizza-card-choice"><input type="checkbox" id="peppa-hog" name="toppings" value="Peppa Hog"><label for="peppa-hog">Peppa Hog</label></figcaption>
              </figure>
              <figure class="pizza-card">
                <img src="${pizzaImages.basil}" width="590" height="420" alt="Margherita pizza slice with basil">
                <figcaption class="pizza-card-choice"><input type="checkbox" id="basil-exposition" name="toppings" value="Basil Exposition"><label for="basil-exposition">Basil Exposition</label></figcaption>
              </figure>
              <figure class="pizza-card">
                <img src="${pizzaImages.garlic}" width="590" height="420" alt="White garlic pizza slice with basil">
                <figcaption class="pizza-card-choice"><input type="checkbox" id="draculas-nightmare" name="toppings" value="Dracula's Nightmare"><label for="draculas-nightmare">Dracula’s Nightmare</label></figcaption>
              </figure>
            </fieldset>
            <fieldset class="pizza-options pizza-base">
              <legend>The Base</legend>
              <div class="base-options">
                <label for="traditional-base"><input type="radio" id="traditional-base" name="base" value="traditional" checked><span>Traditional base</span></label>
                <label for="deep-pan-base"><input type="radio" id="deep-pan-base" name="base" value="deep pan"><span>Deep pan base</span></label>
              </div>
            </fieldset>
            <div class="pan-depth">
              <label for="pan-depth">How deep is your pan?</label>
              <input type="range" id="pan-depth" name="pan-depth" min="0" max="10" value="1">
              <div class="pan-depth-labels" aria-hidden="true"><span>deep</span><span>the abyss</span></div>
            </div>
            <button type="submit">Get baked</button>
            <output class="pizza-order-status" role="status" aria-label="Pizza order status"></output>
          </form>
        </div>`;

      const form = root.querySelector<HTMLFormElement>(".pizza-form")!;
      const themeColor = root.querySelector<HTMLInputElement>("#theme-color")!;
      const orderStatus = root.querySelector<HTMLOutputElement>(".pizza-order-status")!;
      themeColor.addEventListener(
        "input",
        () => {
          form.style.setProperty("--theme-color", themeColor.value);
        },
        { signal: context.signal },
      );
      form.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
          const data = new FormData(form);
          const toppings = data.getAll("toppings").map(String);
          const toppingText = toppings.length > 0 ? toppings.join(", ") : "no toppings";
          const selectedBase = data.get("base");
          const base = typeof selectedBase === "string" ? selectedBase : "traditional";
          const message = `Pizza ready: ${base} base with ${toppingText}.`;
          orderStatus.textContent = message;
          context.announce(message);
        },
        { signal: context.signal },
      );
    },
    unmount() {
      host?.remove();
      host = undefined;
    },
  };
}

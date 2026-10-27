import type { DemoModule } from "../demo-types";
import originalStyles from "../../../layer-cake/css/main.css?raw";

const layers = {
  base: {
    flavour: "strawberry",
    swatch: "#e2587f",
    description: "The rounded silhouette and golden sponge.",
  },
  components: {
    flavour: "chocolate",
    swatch: "#6f4327",
    description: "The cherry on top and soft shadow beneath.",
  },
  utils: {
    flavour: "matcha",
    swatch: "#93a455",
    description: "The flavour label, set in tracked capitals.",
  },
} as const;
type Layer = keyof typeof layers;

// These blocks never change or move. Only their preceding order statement changes.
const layerBlocks = `
@layer base {
  .cake-body {
    border-start-start-radius: 0.5rem;
    border-start-end-radius: 0.5rem;
    border-end-end-radius: 1.1rem;
    border-end-start-radius: 1.1rem;
  }
  .cake-sponge { background: linear-gradient(#e6b87f, #d09850); }
  .cake-icing { background: #e2587f; }
  .cake-flavour::after { content: "strawberry icing"; }
}
@layer components {
  .cake-body { box-shadow: 0 1.1rem 1.4rem -0.9rem rgba(40, 28, 22, 0.45); }
  .cake-cherry { box-shadow: inset -0.2rem -0.2rem 0.3rem rgba(0,0,0,0.25); }
  .cake-icing { background: #6f4327; }
  .cake-flavour::after { content: "chocolate icing"; }
}
@layer utils {
  .cake-flavour { text-transform: uppercase; letter-spacing: 0.22em; }
  .cake-icing { background: #93a455; }
  .cake-flavour::after { content: "matcha icing"; }
}`;

export function createDemo(): DemoModule {
  let host: HTMLElement | undefined;
  let listeners: AbortController | undefined;
  const cleanup = () => {
    listeners?.abort();
    host?.remove();
    host = undefined;
  };
  return {
    mount(container, context) {
      cleanup();
      if (context.signal.aborted) return;
      listeners = new AbortController();
      const options = { signal: listeners.signal };
      context.signal.addEventListener("abort", cleanup, { once: true, ...options });
      host = document.createElement("div");
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>${originalStyles.replace(":root {", ":host {").replace("body {", ":host {")}
          :host { display:block; padding:1rem; }
          .layer-cake-main { grid-template-columns:minmax(0,1fr); }
          .layer-name { flex-wrap:wrap; }
          .layer { gap:.5rem; padding:.65rem; }
          .panel { min-inline-size:0; padding:1rem; }
          .code-block { overflow:auto; }
          .code-block:focus-visible { outline:3px solid var(--focus); outline-offset:3px; }
          .layer-badge { color:#46612c; }
          .code-blocks { color:#c9bfb2; }
        </style>
        <div class="layer-cake">
          <p class="layer-cake-lede">Drag to restack the layers, or use their move buttons. The top layer wins the icing colour and flavour. Every layer still contributes its unique details.</p>
          <div class="layer-cake-main">
            <section class="panel" aria-labelledby="result-title">
              <h3 class="panel-title" id="result-title">The result</h3>
              <figure class="cake">
                <div class="cake-scene" aria-hidden="true">
                  <span class="cake-cherry"></span><div class="cake-icing"></div>
                  <div class="cake-body"><div class="cake-sponge"></div><div class="cake-cream"></div><div class="cake-sponge"></div><div class="cake-cream"></div><div class="cake-sponge"></div></div>
                </div>
                <figcaption><span class="cake-flavour" aria-hidden="true"></span><span class="visually-hidden" data-flavour></span></figcaption>
              </figure>
              <dl class="cake-legend"><dt>base</dt><dd>Rounded silhouette and golden sponge.</dd><dt>components</dt><dd>Cherry shading and a soft shadow.</dd><dt>utils</dt><dd>Tracked, uppercase flavour label.</dd></dl>
              <p class="cake-note">The visible flavour comes from CSS <code>content</code> to demonstrate the cascade. Real content belongs in markup; an accessible text equivalent and announcements are provided here.</p>
            </section>
            <section class="panel" aria-labelledby="stack-title"><h3 class="panel-title" id="stack-title">The stack</h3><p class="panel-hint">Top wins. Drag to reorder, or use the move buttons.</p><ol class="layers"></ol></section>
            <section class="panel code" aria-labelledby="code-title"><h3 class="code-title" id="code-title">Generated CSS</h3><p class="code-note">Only the order statement changes. The blocks never move. The last-declared layer wins.</p><pre class="code-block" tabindex="0" role="region" aria-label="Generated layer CSS"><code><span class="code-statement"></span><span class="code-blocks"></span></code></pre></section>
          </div>
        </div>`;
      container.append(host);
      const style = document.createElement("style");
      root.append(style);
      const list = root.querySelector<HTMLOListElement>(".layers")!;
      let order: Layer[] = ["base", "components", "utils"];
      let dragged: Layer | undefined;
      const render = (announce = false) => {
        const statement = `@layer ${[...order].reverse().join(", ")};`;
        style.textContent = statement + layerBlocks;
        root.querySelector(".code-statement")!.textContent = statement;
        root.querySelector(".code-blocks")!.textContent = layerBlocks;
        list.innerHTML = order
          .map(
            (id, index) => `
          <li class="layer" draggable="true" data-id="${id}">
            <span class="layer-handle" aria-hidden="true">☰</span>
            <span class="layer-name"><span class="layer-chip" style="background:${layers[id].swatch}"></span>${id}${index === 0 ? '<span class="layer-badge">on top · wins</span>' : ""}</span>
            <div class="layer-controls"><button type="button" class="layer-move" data-direction="up" aria-label="Move ${id} up" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" class="layer-move" data-direction="down" aria-label="Move ${id} down" ${index === order.length - 1 ? "disabled" : ""}>↓</button></div>
            <p class="layer-desc">${layers[id].description}</p>
          </li>`,
          )
          .join("");
        const winner = order[0]!;
        root.querySelector("[data-flavour]")!.textContent = `${layers[winner].flavour} icing`;
        if (announce)
          context.announce(
            `${winner} is on top of the stack, so the icing is ${layers[winner].flavour}.`,
          );
      };
      const focusMoved = (id: Layer, direction: string) => {
        const item = list.querySelector(`[data-id="${id}"]`)!;
        const preferred = item.querySelector<HTMLButtonElement>(`[data-direction="${direction}"]`)!;
        (preferred.disabled
          ? item.querySelector<HTMLButtonElement>("button:not(:disabled)")
          : preferred
        )?.focus();
      };
      const itemFor = (event: Event) =>
        event.target instanceof Element ? event.target.closest<HTMLElement>(".layer") : null;
      const clearHints = () =>
        list
          .querySelectorAll(".layer")
          .forEach((item) =>
            item.classList.remove("layer-drop-before", "layer-drop-after", "layer-dragging"),
          );
      list.addEventListener(
        "click",
        (event) => {
          const button =
            event.target instanceof Element
              ? event.target.closest<HTMLButtonElement>("button")
              : null;
          const id = itemFor(event)?.dataset.id as Layer | undefined;
          if (!button || button.disabled || !id) return;
          const from = order.indexOf(id);
          const direction = button.dataset.direction!;
          const to = from + (direction === "up" ? -1 : 1);
          if (to < 0 || to >= order.length) return;
          order.splice(from, 1);
          order.splice(to, 0, id);
          render(true);
          focusMoved(id, direction);
        },
        options,
      );
      list.addEventListener(
        "dragstart",
        (event) => {
          const item = itemFor(event);
          if (!item || !event.dataTransfer) return;
          dragged = item.dataset.id as Layer;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", dragged);
          item.classList.add("layer-dragging");
        },
        options,
      );
      list.addEventListener(
        "dragover",
        (event) => {
          const item = itemFor(event);
          if (!dragged || !item || item.dataset.id === dragged) return;
          event.preventDefault();
          clearHints();
          const rect = item.getBoundingClientRect();
          item.classList.add(
            event.clientY > rect.top + rect.height / 2 ? "layer-drop-after" : "layer-drop-before",
          );
        },
        options,
      );
      list.addEventListener(
        "drop",
        (event) => {
          const item = itemFor(event);
          if (!dragged || !item || item.dataset.id === dragged) return;
          event.preventDefault();
          const id = dragged;
          const rect = item.getBoundingClientRect();
          order = order.filter((layer) => layer !== id);
          const to =
            order.indexOf(item.dataset.id as Layer) +
            (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
          order.splice(to, 0, id);
          dragged = undefined;
          render(true);
          focusMoved(id, "up");
        },
        options,
      );
      list.addEventListener("dragleave", clearHints, options);
      list.addEventListener(
        "dragend",
        () => {
          dragged = undefined;
          clearHints();
        },
        options,
      );
      render();
    },
    unmount: cleanup,
  };
}

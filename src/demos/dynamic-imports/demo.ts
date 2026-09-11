import type { DemoModule } from "../demo-types";
import { DemoImportError } from "../demo-import-error";

export function createDemo(): DemoModule {
  let host: HTMLElement | undefined;
  return {
    async mount(container, context) {
      host = document.createElement("div");
      container.append(host);
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          :host { display:block; color:#23352e; font:inherit; }
          * { box-sizing:border-box; }
          section { margin-block:1rem; padding:1rem; border:1px solid #c2cbb9; border-radius:.75rem; background:#f6f4e9; }
          h3 { margin-block:0 .75rem; font-size:1.15rem; }
          .navigation { display:flex; gap:.5rem; margin-block-end:.75rem; }
          button { padding:.65rem 1rem; font:inherit; background:#215c4f; color:white; border:0; border-radius:2rem; cursor:pointer; }
          button:focus-visible,.cards-track:focus-visible { outline:3px solid #8a3f20; outline-offset:3px; }
          .cards-track { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(12rem,60%); gap:1rem; overflow-x:auto; padding-block:.25rem .75rem; scroll-snap-type:x proximity; }
          article { padding:1rem; min-height:8rem; background:#dfeee9; border:1px solid #b3c5b8; border-radius:.5rem; scroll-snap-align:start; }
          code { overflow-wrap:anywhere; }
        </style>
        <p>The first slider uses <code>data-show-navigation</code> to load an extra JavaScript module. The second stays scrollable without loading navigation behavior.</p>
        <section data-show-navigation aria-labelledby="with-navigation">
          <h3 id="with-navigation">Slider with optional navigation</h3>
          <div class="navigation"><button type="button" data-action="previous">Previous</button><button type="button" data-action="next">Next</button></div>
          <div class="cards-track" tabindex="0" role="region" aria-label="Cards with navigation">${["Alpha", "Bravo", "Charlie", "Delta", "Echo"].map((label) => `<article>${label} card</article>`).join("")}</div>
        </section>
        <section aria-labelledby="without-navigation">
          <h3 id="without-navigation">Slider without navigation</h3>
          <div class="cards-track" tabindex="0" role="region" aria-label="Cards without navigation">${["One", "Two", "Three", "Four", "Five"].map((label) => `<article>${label}</article>`).join("")}</div>
        </section>`;
      for (const slider of root.querySelectorAll<HTMLElement>("[data-show-navigation]")) {
        const { setupNavigation } = await import("./navigation").catch((error: unknown) => {
          throw new DemoImportError(error);
        });
        if (context.signal.aborted) return;
        setupNavigation(slider, context.signal, context.reducedMotion);
      }
    },
    unmount() {
      host?.remove();
      host = undefined;
    },
  };
}

import type { DemoModule } from "../demo-types";
import originalStyles from "../../../property-transition/css/main.css?raw";
import originalRegistry from "../../../property-transition/css/properties.css?raw";

let nextInstance = 0;
const propertyNames = [
  "--spotlight-angle",
  "--spotlight-x",
  "--spotlight-y",
  "--spotlight-spread",
  "--spotlight-color",
  "--field-color",
] as const;

export function createDemo(): DemoModule {
  let host: HTMLElement | undefined;
  let registry: HTMLStyleElement | undefined;
  let listeners: AbortController | undefined;
  const cleanup = () => {
    listeners?.abort();
    // CSS.registerProperty has no unregister API. A removable stylesheet does.
    registry?.remove();
    registry = undefined;
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
      const prefix = `--little-demos-light-${++nextInstance}-`;
      const scopeProperties = (css: string) =>
        propertyNames.reduce(
          (result, name) => result.replaceAll(name, prefix + name.slice(2)),
          css,
        );
      const registryCss = scopeProperties(originalRegistry);
      // Registrations in a shadow stylesheet are ignored by browsers. Only the
      // per-mount, namespaced @property rules enter document scope; selectors stay local.
      // https://developer.chrome.com/docs/css-ui/css-names
      registry = document.createElement("style");
      registry.dataset.propertyTransitionRegistry = "";
      registry.textContent = registryCss;
      const registryStyle = registry;
      host = document.createElement("div");
      host.dataset.reducedMotion = String(context.reducedMotion);
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>${scopeProperties(originalStyles).replace(":root {", ":host {").replace("body {", ":host {")}
          :host { display:block; min-block-size:0; }
          :host([data-reduced-motion="true"]) .spotlight-scene { transition:none; }
          .property-demo { padding:1rem; }
          .demo-layout { grid-template-columns:minmax(0,1fr); }
          .controls-panel { position:static; min-inline-size:0; }
          .demo-header { margin-block-end:1rem; }
          h3 { margin-block:0 1rem; font-size:1rem; }
          .registry-button[aria-pressed="true"] { background:#923a31; }
          .code-sample { max-block-size:16rem; overflow:auto; }
          .code-sample:focus-visible { outline:3px solid var(--focus); outline-offset:3px; }
        </style>
        <div class="property-demo" data-cue="matinee" data-registered="false">
          <div class="demo-header"><p>The spotlight uses custom properties for its angle, position, spread, and colour. Without <code>@property</code>, the cue snaps. Enable the definitions and those same values interpolate.</p></div>
          <div class="demo-layout">
            <section class="stage-panel" aria-labelledby="stage-title"><h3 id="stage-title">The result</h3>
              <figure class="spotlight-figure"><div class="spotlight-scene" data-angle-property="${prefix}spotlight-angle" aria-hidden="true"><div class="spotlight-beam"></div></div><figcaption><strong>Watch the spotlight.</strong> Flip the cue before and after registering the property definitions.</figcaption></figure>
            </section>
            <section class="controls-panel" aria-labelledby="controls-title"><h3 id="controls-title">The controls</h3>
              <button type="button" class="registry-button" aria-pressed="false">Register @property rules</button>
              <label class="cue-switch" for="cue-switch"><input type="checkbox" id="cue-switch"> <span>Run the midnight cue</span></label>
              <dl class="readout"><div><dt>Registry</dt><dd data-registry-status>inactive</dd></div><div><dt>Cue</dt><dd data-cue-status>matinee</dd></div></dl>
              <p>Property definitions are attached to the document only while enabled. Each opening gets unique names; closing removes the registry.</p>
              <p data-motion-note></p>
              <pre class="code-sample" tabindex="0" role="region" aria-label="Property registration CSS"><code></code></pre>
            </section>
          </div>
        </div>`;
      container.append(host);
      const demo = root.querySelector<HTMLElement>(".property-demo")!;
      const button = root.querySelector<HTMLButtonElement>(".registry-button")!;
      const cue = root.querySelector<HTMLInputElement>("#cue-switch")!;
      const scene = root.querySelector<HTMLElement>(".spotlight-scene")!;
      const motionNote = root.querySelector<HTMLElement>("[data-motion-note]")!;
      const renderMotion = (reducedMotion: boolean) => {
        host!.dataset.reducedMotion = String(reducedMotion);
        if (reducedMotion) {
          for (const animation of scene.getAnimations()) animation.cancel();
        }
        motionNote.textContent = reducedMotion
          ? "Reduced motion is enabled: both cues change immediately, including registered properties."
          : "Registered properties transition for one second.";
      };
      context.onReducedMotionChange(renderMotion);
      const announce = () =>
        context.announce(
          `Custom properties are ${demo.dataset.registered === "true" ? "registered" : "unregistered"}. Current cue is ${demo.dataset.cue}.`,
        );
      const renderRegistry = () => {
        const registered = demo.dataset.registered === "true";
        button.setAttribute("aria-pressed", String(registered));
        button.textContent = registered ? "Disable @property rules" : "Register @property rules";
        root.querySelector("[data-registry-status]")!.textContent = registered
          ? "active"
          : "inactive";
        root.querySelector(".code-sample code")!.textContent =
          `/* Registry stylesheet ${registered ? "attached" : "detached"} */\n${registryCss}`;
      };
      button.addEventListener(
        "click",
        () => {
          // Disabling while a cue is transitioning should finish at the current cue.
          for (const animation of scene.getAnimations()) animation.cancel();
          const registered = demo.dataset.registered !== "true";
          if (registered) document.head.append(registryStyle);
          else registryStyle.remove();
          demo.dataset.registered = String(registered);
          renderRegistry();
          announce();
        },
        options,
      );
      cue.addEventListener(
        "change",
        () => {
          demo.dataset.cue = cue.checked ? "midnight" : "matinee";
          root.querySelector("[data-cue-status]")!.textContent = demo.dataset.cue;
          announce();
        },
        options,
      );
      renderRegistry();
    },
    unmount: cleanup,
  };
}

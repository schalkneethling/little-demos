"use strict";

// Layer metadata. The swatch values mirror the icing colours declared in
// the layer blocks below, purely so the UI can preview each layer's colour.
const LAYERS = {
  base: {
    label: "base",
    desc: "The rounded silhouette and golden sponge.",
    flavour: "strawberry",
    swatch: "#e2587f",
  },
  components: {
    label: "components",
    desc: "The cherry on top and the soft shadow beneath.",
    flavour: "chocolate",
    swatch: "#6f4327",
  },
  utils: {
    label: "utils",
    desc: "The flavour label, set in tracked capitals.",
    flavour: "matcha",
    swatch: "#93a455",
  },
};

// The static layer blocks. These are constant. Only the @layer statement
// prepended to them changes. Each layer owns properties no other layer
// sets, except .cake-icing background, which all three contest.
const LAYER_BLOCKS = [
  "",
  "@layer base {",
  "  /* base — the foundation everything sits on */",
  "  .cake-body {",
  "    border-start-start-radius: 0.5rem;",
  "    border-start-end-radius: 0.5rem;",
  "    border-end-end-radius: 1.1rem;",
  "    border-end-start-radius: 1.1rem;",
  "  }",
  "  .cake-sponge { background: linear-gradient(#e6b87f, #d09850); }",
  "  .cake-icing { background: #e2587f; } /* contested: strawberry */",
  '  .cake-flavour::after { content: "strawberry icing"; } /* contested */',
  "}",
  "",
  "@layer components {",
  "  /* components — the assembled extras */",
  "  .cake-body { box-shadow: 0 1.1rem 1.4rem -0.9rem rgba(40, 28, 22, 0.45); }",
  "  .cake-cherry { box-shadow: inset -0.2rem -0.2rem 0.3rem rgba(0,0,0,0.25); }",
  "  .cake-icing { background: #6f4327; } /* contested: chocolate */",
  '  .cake-flavour::after { content: "chocolate icing"; } /* contested */',
  "}",
  "",
  "@layer utils {",
  "  /* utils — the finishing flourish */",
  "  .cake-flavour { text-transform: uppercase; letter-spacing: 0.22em; }",
  "  .cake-icing { background: #93a455; } /* contested: matcha */",
  '  .cake-flavour::after { content: "matcha icing"; } /* contested */',
  "}",
].join("\n");

// State: index 0 is the top of the cake and the cascade winner.
let order = ["base", "components", "utils"];
let draggedId = null;

const layersEl = document.getElementById("layers");
const styleEl = document.getElementById("layerStyles");
const codeEl = document.getElementById("code");
const statusEl = document.getElementById("status");

// The @layer statement declares the winner LAST, so reverse the visual
// order. This is the single line the demo controls.
function statementOrder() {
  return [...order].reverse();
}

function applyLayerOrder() {
  const statement = "@layer " + statementOrder().join(", ") + ";";
  styleEl.textContent = statement + "\n" + LAYER_BLOCKS;
}

function renderCode() {
  const declared = statementOrder();
  const winner = declared[declared.length - 1];
  const lead = declared.slice(0, -1).join(", ");
  const prefix = lead ? lead + ", " : "";

  codeEl.innerHTML = "";

  const statement = document.createElement("span");
  statement.className = "code-statement";
  statement.append(document.createTextNode("@layer " + prefix));

  const winnerSpan = document.createElement("span");
  winnerSpan.className = "code-winner";
  winnerSpan.textContent = winner;
  statement.append(winnerSpan, document.createTextNode(";"));

  const caption = document.createElement("span");
  caption.className = "code-caption";
  caption.textContent = "  /* " + winner + " declared last \u2192 wins */";

  const blocks = document.createElement("span");
  blocks.className = "code-blocks";
  blocks.textContent = LAYER_BLOCKS;

  codeEl.append(statement, caption, blocks);
}

function renderLayers() {
  layersEl.innerHTML = "";

  order.forEach((id, index) => {
    const data = LAYERS[id];
    const isFirst = index === 0;
    const isLast = index === order.length - 1;

    const li = document.createElement("li");
    li.className = "layer";
    li.draggable = true;
    li.dataset.id = id;

    const handle = document.createElement("span");
    handle.className = "layer-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.textContent = "\u2630"; // trigram, a drag affordance

    const name = document.createElement("span");
    name.className = "layer-name";

    const chip = document.createElement("span");
    chip.className = "layer-chip";
    chip.style.background = data.swatch;

    name.append(chip, document.createTextNode(data.label));

    if (isFirst) {
      const badge = document.createElement("span");
      badge.className = "layer-badge";
      badge.textContent = "on top \u00b7 wins";
      name.append(badge);
    }

    const desc = document.createElement("p");
    desc.className = "layer-desc";
    desc.textContent = data.desc;

    const controls = document.createElement("div");
    controls.className = "layer-controls";

    const up = document.createElement("button");
    up.type = "button";
    up.className = "layer-move";
    up.textContent = "\u2191";
    up.setAttribute("aria-label", "Move " + data.label + " up");
    up.disabled = isFirst;
    up.addEventListener("click", () => move(index, index - 1));

    const down = document.createElement("button");
    down.type = "button";
    down.className = "layer-move";
    down.textContent = "\u2193";
    down.setAttribute("aria-label", "Move " + data.label + " down");
    down.disabled = isLast;
    down.addEventListener("click", () => move(index, index + 1));

    controls.append(up, down);
    li.append(handle, name, controls, desc);

    attachDragHandlers(li);
    layersEl.append(li);
  });
}

function announce() {
  const winner = LAYERS[order[0]];
  statusEl.textContent =
    winner.label + " is on top of the stack, so the icing is " + winner.flavour + ".";
}

// The icing colour and the flavour word are never set here. Rewriting the
// layer order is enough; CSS resolves both contested properties on its own.
function render() {
  applyLayerOrder();
  renderLayers();
  renderCode();
  announce();
}

function move(from, to) {
  if (to < 0 || to >= order.length) return;
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  order = next;
  render();

  // Keep keyboard focus on the moved item's matching control.
  const moved = layersEl.querySelector('[data-id="' + item + '"]');
  if (moved) {
    const selector = to === 0 ? ".layer-move:last-child" : ".layer-move";
    const target = moved.querySelector(selector);
    if (target && !target.disabled) target.focus();
  }
}

// Native HTML drag and drop covers pointer users. It is not keyboard
// accessible, which is why every item also carries move buttons and the
// status region announces each change.
function attachDragHandlers(li) {
  li.addEventListener("dragstart", (event) => {
    draggedId = li.dataset.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedId);
    li.classList.add("layer-dragging");
  });

  li.addEventListener("dragend", () => {
    draggedId = null;
    clearDropHints();
    const dragging = layersEl.querySelector(".layer-dragging");
    if (dragging) dragging.classList.remove("layer-dragging");
  });

  li.addEventListener("dragover", (event) => {
    if (!draggedId || li.dataset.id === draggedId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const after = isPointerInLowerHalf(event, li);
    li.classList.toggle("layer-drop-after", after);
    li.classList.toggle("layer-drop-before", !after);
  });

  li.addEventListener("dragleave", () => {
    li.classList.remove("layer-drop-before", "layer-drop-after");
  });

  li.addEventListener("drop", (event) => {
    if (!draggedId || li.dataset.id === draggedId) return;
    event.preventDefault();

    const after = isPointerInLowerHalf(event, li);
    const next = order.filter((id) => id !== draggedId);
    const targetIndex = next.indexOf(li.dataset.id);
    next.splice(after ? targetIndex + 1 : targetIndex, 0, draggedId);

    order = next;
    clearDropHints();
    render();
  });
}

function isPointerInLowerHalf(event, element) {
  const rect = element.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

function clearDropHints() {
  layersEl
    .querySelectorAll(".layer-drop-before, .layer-drop-after")
    .forEach((el) => el.classList.remove("layer-drop-before", "layer-drop-after"));
}

render();

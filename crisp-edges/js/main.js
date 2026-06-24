const BASE_SIZE = 240;

const stage = document.querySelector(".demo__stage");
const character = document.getElementById("character");
const crispCheckbox = document.getElementById("crisp-edges");
const scaleInput = document.getElementById("scale");
const scaleValue = document.getElementById("scale-value");
const sizeLabel = document.getElementById("size-label");

function formatScale(scale) {
  return Number.isInteger(scale) ? `${scale}×` : `${scale.toFixed(2).replace(/\.?0+$/, "")}×`;
}

function applyScale(scale) {
  const size = BASE_SIZE * scale;

  stage.style.setProperty("--character-size", `${size}px`);

  const displaySize = Math.round(size);
  const label = `${formatScale(scale)}`;
  scaleValue.textContent = label;
  sizeLabel.textContent = `${displaySize} × ${displaySize} px (${label})`;
}

function applyCrispEdges(enabled) {
  character.classList.toggle("is-crisp", enabled);
}

crispCheckbox.addEventListener("change", () => {
  applyCrispEdges(crispCheckbox.checked);
});

scaleInput.addEventListener("input", () => {
  applyScale(Number(scaleInput.value));
});

applyScale(Number(scaleInput.value));
applyCrispEdges(crispCheckbox.checked);

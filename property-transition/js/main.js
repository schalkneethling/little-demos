"use strict";

const demo = document.querySelector(".property-demo");
const registryLink = document.getElementById("property-registry");
const registryButton = document.getElementById("registry-button");
const registryStatus = document.getElementById("registry-status");
const cueSwitch = document.getElementById("cue-switch");
const cueStatus = document.getElementById("cue-status");
const status = document.getElementById("status");
const codeSample = document.querySelector(".code-sample code");

function announce() {
  const registryText = demo.dataset.registered === "true" ? "registered" : "unregistered";
  const cueText = demo.dataset.cue;
  status.textContent =
    "Custom properties are " + registryText + ". Current cue is " + cueText + ".";
}

function renderRegistry() {
  const isRegistered = demo.dataset.registered === "true";

  registryButton.setAttribute("aria-pressed", String(isRegistered));
  registryButton.textContent = isRegistered
    ? "Disable @property rules"
    : "Register @property rules";
  registryStatus.textContent = isRegistered ? "active" : "inactive";
  codeSample.textContent = isRegistered
    ? '<link rel="stylesheet"\n      href="css/properties.css">'
    : '<link rel="stylesheet"\n      href="css/properties.css"\n      disabled>';
}

function toggleProperties() {
  const shouldRegister = demo.dataset.registered !== "true";

  registryLink.disabled = !shouldRegister;
  if (shouldRegister) {
    registryLink.removeAttribute("disabled");
  } else {
    registryLink.setAttribute("disabled", "");
  }

  demo.dataset.registered = String(shouldRegister);
  renderRegistry();
  announce();
}

function updateCue() {
  const cue = cueSwitch.checked ? "midnight" : "matinee";
  demo.dataset.cue = cue;
  cueStatus.textContent = cue;
  announce();
}

registryButton.addEventListener("click", toggleProperties);
cueSwitch.addEventListener("change", updateCue);
renderRegistry();
announce();

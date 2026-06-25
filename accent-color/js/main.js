const form = document.querySelector(".pizza-form");
const themeColorInput = document.querySelector("#theme-color");

themeColorInput.addEventListener("input", (event) => {
  form.style.setProperty("--theme-color", event.target.value);
  form.dataset.themeColor = "set";
});

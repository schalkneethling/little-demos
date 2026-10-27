import emojiData from "../data/emoji.json" with { type: "json" };

const container = document.createElement("ul");
container.classList.add("emoji-list");

const emojis = emojiData.map((emoji) => {
  const item = document.createElement("li");
  item.innerHTML = emoji.htmlCode;
  return item;
});

container.append(...emojis);

document.body.appendChild(container);

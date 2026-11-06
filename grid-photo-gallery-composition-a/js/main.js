const blocks = Array.from(document.querySelectorAll(".block"));

async function getImages() {
  try {
    const response = await fetch("https://picsum.photos/v2/list?limit=28");

    if (response.ok) {
      const imageList = await response.json();
      return imageList.map((image) => {
        return {
          author: image.author,
          download: image.download_url,
          view: image.url,
        };
      });
    }
  } catch (error) {
    console.error(error);
  }
}

async function render() {
  const images = await getImages();

  blocks.forEach((block, index) => {
    block.style.backgroundImage = `url("${images[index].download}")`;
    block.title = `Artist: ${images[index].author} on Unsplash`;
    block.href = images[index].view;
  });
}

render();

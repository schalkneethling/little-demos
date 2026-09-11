const COMPRESSED_EXTENSIONS = new Set([
  "zip",
  "gz",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "mp3",
  "mp4",
  "mov",
  "avi",
  "pdf",
]);

class FileDropzone extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    const label = this.getAttribute("label") || "Choose a file";
    const hint =
      this.getAttribute("hint") || "Drag and drop a single file here or click to browse.";
    const accept = this.getAttribute("accept") || "";

    this.innerHTML = `
      <div class="dropzone" data-dragging="false">
        <input class="dropzone-input" type="file" ${accept ? `accept="${accept}"` : ""} />
        <div class="dropzone-body">
          <h3 class="dropzone-title">${label}</h3>
          <p class="dropzone-copy">${hint}</p>
          <div class="selected-file" hidden></div>
        </div>
      </div>
    `;

    this.dropzone = this.querySelector(".dropzone");
    this.input = this.querySelector(".dropzone-input");
    this.selectedFile = this.querySelector(".selected-file");

    this.input.addEventListener("change", () => {
      const [file] = this.input.files;
      this.handleFile(file);
    });

    this.dropzone.addEventListener("dragenter", (event) => {
      event.preventDefault();
      this.dropzone.dataset.dragging = "true";
    });

    this.dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      this.dropzone.dataset.dragging = "true";
    });

    this.dropzone.addEventListener("dragleave", (event) => {
      if (event.currentTarget === event.target) {
        this.dropzone.dataset.dragging = "false";
      }
    });

    this.dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      this.dropzone.dataset.dragging = "false";
      const [file] = event.dataTransfer.files;
      this.input.files = event.dataTransfer.files;
      this.handleFile(file);
    });
  }

  clear() {
    if (this.input) {
      this.input.value = "";
    }
    if (this.selectedFile) {
      this.selectedFile.hidden = true;
      this.selectedFile.innerHTML = "";
    }
  }

  handleFile(file) {
    if (!file) {
      this.clear();
      return;
    }

    this.selectedFile.hidden = false;
    this.selectedFile.innerHTML = `
      <div class="file-chip">
        <strong>${escapeHtml(file.name)}</strong>
        <span>${formatBytes(file.size)}</span>
      </div>
    `;

    this.dispatchEvent(
      new CustomEvent("file-selected", {
        bubbles: true,
        detail: { file },
      }),
    );
  }
}

class DownloadResult extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <section class="results-panel" hidden>
        <h2 class="section-heading">Ready to download</h2>
        <p class="section-copy">
          Your processed file is ready. Adjust the name if you want, then save it.
        </p>
        <div class="name-field">
          <label for="output-name">Output filename</label>
          <input id="output-name" name="output-name" type="text" />
        </div>
        <dl class="metric-list"></dl>
        <ul class="meta-list"></ul>
        <div class="actions">
          <button class="primary-button" type="button">Download file</button>
        </div>
      </section>
    `;

    this.panel = this.querySelector(".results-panel");
    this.nameInput = this.querySelector("#output-name");
    this.metricList = this.querySelector(".metric-list");
    this.metaList = this.querySelector(".meta-list");
    this.downloadButton = this.querySelector(".primary-button");

    this.downloadButton.addEventListener("click", () => {
      if (!this.blob) {
        return;
      }

      const outputName = this.nameInput.value.trim() || "download.bin";
      const url = URL.createObjectURL(this.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = outputName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  clear() {
    this.blob = null;
    this.panel.hidden = true;
    this.nameInput.value = "";
    this.metricList.innerHTML = "";
    this.metaList.innerHTML = "";
  }

  setResult({ blob, suggestedName, sourceFile, mode, note, gzipFilename }) {
    this.blob = blob;
    this.panel.hidden = false;
    this.nameInput.value = suggestedName;

    const delta = sourceFile.size - blob.size;
    const ratio = sourceFile.size > 0 ? ((blob.size / sourceFile.size) * 100).toFixed(1) : "0.0";
    const ratioLabel =
      mode === "compress" ? `${ratio}% of original` : `${ratio}% of compressed file`;

    this.metricList.innerHTML = `
      <div class="metric-row">
        <dt>Input size</dt>
        <dd>${formatBytes(sourceFile.size)}</dd>
      </div>
      <div class="metric-row">
        <dt>Output size</dt>
        <dd>${formatBytes(blob.size)}</dd>
      </div>
      <div class="metric-row">
        <dt>${mode === "compress" ? "Compression ratio" : "Expansion ratio"}</dt>
        <dd>${ratioLabel}</dd>
      </div>
      <div class="metric-row">
        <dt>${mode === "compress" ? "Bytes saved" : "Size difference"}</dt>
        <dd>${delta >= 0 ? "-" : "+"}${formatBytes(Math.abs(delta))}</dd>
      </div>
    `;

    const items = [];
    if (note) {
      items.push(`<li>${escapeHtml(note)}</li>`);
    }
    if (gzipFilename) {
      items.push(`<li>Embedded gzip filename: <code>${escapeHtml(gzipFilename)}</code></li>`);
    }
    items.push(
      `<li>Output type: <code>${escapeHtml(blob.type || "application/octet-stream")}</code></li>`,
    );
    this.metaList.innerHTML = items.join("");
  }
}

class GzipTool extends HTMLElement {
  connectedCallback() {
    this.mode = "compress";
    this.selectedFile = null;
    this.resultBlob = null;
    this.render();
    this.attachEvents();
    this.updateUi();
  }

  render() {
    this.innerHTML = `
      <section class="tool-card">
        <div class="tool-grid">
          <div class="tool-main">
            <div class="mode-switcher" role="tablist" aria-label="Mode switcher">
              <button type="button" data-mode="compress" aria-pressed="true">Compress</button>
              <button type="button" data-mode="decompress" aria-pressed="false">Decompress</button>
            </div>

            <h2 class="section-heading"></h2>
            <p class="section-copy"></p>

            <div class="status-banner" data-tone="neutral">
              Select a file to get started.
            </div>

            <file-dropzone></file-dropzone>

            <div class="actions">
              <button class="primary-button action-button" type="button" disabled>
                Process file
              </button>
              <button class="secondary-button reset-button" type="button">
                Reset
              </button>
            </div>

            <download-result></download-result>
          </div>

          <aside class="tool-aside">
            <h2 class="section-heading">Why this demo works</h2>
            <p class="aside-copy">
              The browser handles the gzip stream directly. No third-party compression
              library is needed for the core operation.
            </p>

            <div class="note-card">
              <h3>Single file, not folders</h3>
              <p>
                Gzip wraps one stream of bytes. A folder needs an archive layer like
                <code>tar</code> before gzip enters the picture.
              </p>
            </div>

            <div class="note-card">
              <h3>Best for text and raw assets</h3>
              <p>
                Text, JSON, SVG, and other plain formats compress well. Files that are
                already compressed often change very little.
              </p>
            </div>

            <div class="note-card">
              <h3>Filename recovery is partial</h3>
              <p>
                A <code>.gz</code> file may contain the original filename, but your app
                should still let the user confirm the output name.
              </p>
            </div>
          </aside>
        </div>
      </section>
    `;
  }

  attachEvents() {
    this.modeButtons = Array.from(this.querySelectorAll("[data-mode]"));
    this.heading = this.querySelector(".section-heading");
    this.copy = this.querySelector(".section-copy");
    this.statusBanner = this.querySelector(".status-banner");
    this.dropzone = this.querySelector("file-dropzone");
    this.actionButton = this.querySelector(".action-button");
    this.resetButton = this.querySelector(".reset-button");
    this.result = this.querySelector("download-result");

    this.modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.mode = button.dataset.mode;
        this.selectedFile = null;
        this.result.clear();
        this.dropzone.clear();
        this.updateUi();
      });
    });

    this.dropzone.addEventListener("file-selected", (event) => {
      this.selectedFile = event.detail.file;
      this.result.clear();
      this.updateUi();
    });

    this.actionButton.addEventListener("click", async () => {
      if (!this.selectedFile) {
        return;
      }

      this.setStatus("Working with the stream now. This stays in your browser.", "neutral");
      this.actionButton.disabled = true;

      try {
        if (this.mode === "compress") {
          await this.compressFile(this.selectedFile);
        } else {
          await this.decompressFile(this.selectedFile);
        }
      } catch (error) {
        this.result.clear();
        this.setStatus(error.message, "warning");
      } finally {
        this.actionButton.disabled = !this.selectedFile;
      }
    });

    this.resetButton.addEventListener("click", () => {
      this.selectedFile = null;
      this.dropzone.clear();
      this.result.clear();
      this.updateUi();
    });
  }

  updateUi() {
    const copyByMode = {
      compress: {
        heading: "Turn one file into a .gz download",
        copy: "Pick a single file and the browser will stream it through gzip for you.",
        label: "Choose a file to compress",
        hint: "Upload one file. The download will be named after the original file with .gz added.",
        accept: "",
      },
      decompress: {
        heading: "Unpack a .gz file back into raw bytes",
        copy: "Pick a single gzip file. If the original filename can be recovered, we will suggest it.",
        label: "Choose a .gz file to decompress",
        hint: "Upload a gzip file. The result may need a filename tweak if the original name is not embedded.",
        accept: ".gz,application/gzip",
      },
    };

    const current = copyByMode[this.mode];
    this.heading.textContent = current.heading;
    this.copy.textContent = current.copy;
    this.dropzone.setAttribute("label", current.label);
    this.dropzone.setAttribute("hint", current.hint);
    this.dropzone.setAttribute("accept", current.accept);
    this.dropzone.render();

    this.modeButtons.forEach((button) => {
      const active = button.dataset.mode === this.mode;
      button.setAttribute("aria-pressed", String(active));
    });

    this.actionButton.disabled = !this.selectedFile;

    if (!this.selectedFile) {
      this.setStatus("Select a file to get started.", "neutral");
      return;
    }

    if (this.mode === "compress") {
      const warning = getCompressionWarning(this.selectedFile.name);
      this.setStatus(
        warning ||
          `Ready to compress ${this.selectedFile.name} (${formatBytes(this.selectedFile.size)}).`,
        warning ? "warning" : "success",
      );
      return;
    }

    if (!this.selectedFile.name.toLowerCase().endsWith(".gz")) {
      this.setStatus(
        "This does not look like a .gz file. Decompression may fail unless the file is actually gzip data.",
        "warning",
      );
      return;
    }

    this.setStatus(
      `Ready to decompress ${this.selectedFile.name} (${formatBytes(this.selectedFile.size)}).`,
      "success",
    );
  }

  setStatus(message, tone = "neutral") {
    this.statusBanner.textContent = message;
    this.statusBanner.dataset.tone = tone;
  }

  async compressFile(file) {
    const compressedStream = file.stream().pipeThrough(new CompressionStream("gzip"));
    const blob = await new Response(compressedStream).blob();
    const suggestedName = `${file.name}.gz`;
    const note =
      getCompressionWarning(file.name) ||
      "Gzip works on raw bytes, so the browser does not need to know the file type first.";

    this.result.setResult({
      blob,
      suggestedName,
      sourceFile: file,
      mode: "compress",
      note,
    });

    this.setStatus(`Compressed ${file.name} and prepared ${suggestedName}.`, "success");
  }

  async decompressFile(file) {
    let blob;

    try {
      const decompressedStream = file.stream().pipeThrough(new DecompressionStream("gzip"));
      blob = await new Response(decompressedStream).blob();
    } catch {
      throw new Error("The selected file could not be decompressed as gzip data.");
    }

    const gzipFilename = await readGzipFilename(file);
    const suggestedName = gzipFilename || removeGzipExtension(file.name) || "unzipped-file";
    const note = gzipFilename
      ? "We found an original filename in the gzip header, but you can still change it."
      : "No original filename was found in the gzip header, so the suggested name is based on the uploaded file.";

    this.result.setResult({
      blob,
      suggestedName,
      sourceFile: file,
      mode: "decompress",
      note,
      gzipFilename,
    });

    this.setStatus(`Decompressed ${file.name} and suggested ${suggestedName}.`, "success");
  }
}

customElements.define("file-dropzone", FileDropzone);
customElements.define("download-result", DownloadResult);
customElements.define("gzip-tool", GzipTool);

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
}

function getCompressionWarning(filename) {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (extension && COMPRESSED_EXTENSIONS.has(extension)) {
    return "This file type is usually already compressed, so the gzip result may be only slightly smaller or even larger.";
  }

  return "";
}

function removeGzipExtension(filename) {
  if (filename.toLowerCase().endsWith(".gz")) {
    return filename.slice(0, -3);
  }

  return filename;
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function readGzipFilename(file) {
  const buffer = await file.slice(0, 512).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 10 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return "";
  }

  const flags = bytes[3];
  let index = 10;

  if (flags & 0x04) {
    if (index + 1 >= bytes.length) {
      return "";
    }
    const xlen = bytes[index] | (bytes[index + 1] << 8);
    index += 2 + xlen;
  }

  if (flags & 0x08) {
    const chars = [];
    while (index < bytes.length && bytes[index] !== 0) {
      chars.push(bytes[index]);
      index += 1;
    }
    return new TextDecoder().decode(new Uint8Array(chars));
  }

  return "";
}

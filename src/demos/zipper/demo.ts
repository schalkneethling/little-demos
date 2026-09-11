import type { DemoModule } from "../demo-types";
import { maximumFileBytes, processGzip, readGzipFilename } from "./gzip";

export function createDemo(): DemoModule {
  let host: HTMLElement | undefined;
  let operation: AbortController | undefined;
  let downloadUrl: string | undefined;
  const release = () => {
    operation?.abort();
    operation = undefined;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = undefined;
  };
  return {
    mount(container, context) {
      host = document.createElement("div");
      container.append(host);
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `
        <style>
          :host { display:block; color:#2f2417; font:inherit; }
          * { box-sizing:border-box; }
          form { display:grid; gap:1rem; padding:1rem; border:1px solid #c9bba7; border-radius:.75rem; background:#fff9ef; }
          label { display:grid; gap:.4rem; font-weight:600; }
          input,select,button { padding:.75rem; font:inherit; border:1px solid #b4a18a; border-radius:.4rem; min-width:0; max-width:100%; }
          button { background:#8a3f20; color:white; cursor:pointer; }
          button:disabled { opacity:.65; cursor:default; }
          :focus-visible { outline:3px solid #215c4f; outline-offset:3px; }
          a { color:#713b20; font-weight:600; }
          output { overflow-wrap:anywhere; }
          [hidden] { display:none; }
        </style>
        <p>Gzip one file, or unpack a <code>.gz</code> file. Processing stays in your browser. Input and output are limited to 10 MB.</p>
        <form>
          <label for="zipper-operation">Operation</label><select id="zipper-operation" name="mode" aria-label="Operation"><option value="compress">Compress to gzip</option><option value="decompress">Decompress gzip</option></select>
          <label>Choose a file<input type="file" name="file" required></label>
          <button type="submit" disabled>Process file</button>
          <output role="status">Choose a file to get started.</output>
          <label hidden data-output-label>Output filename<input name="filename" type="text"></label>
          <a hidden data-download>Download file</a>
        </form>`;
      const form = root.querySelector("form")!;
      const input = root.querySelector<HTMLInputElement>('[name="file"]')!;
      const mode = root.querySelector<HTMLSelectElement>('[name="mode"]')!;
      const button = root.querySelector("button")!;
      const output = root.querySelector("output")!;
      const filename = root.querySelector<HTMLInputElement>('[name="filename"]')!;
      const outputLabel = root.querySelector<HTMLElement>("[data-output-label]")!;
      const download = root.querySelector<HTMLAnchorElement>("[data-download]")!;
      const supported = "CompressionStream" in window && "DecompressionStream" in window;
      if (!supported) {
        output.textContent =
          "This browser does not support Compression Streams. Try a current browser to use Zipper.";
        input.disabled = true;
        mode.disabled = true;
      }
      const clear = () => {
        release();
        download.hidden = true;
        outputLabel.hidden = true;
        download.removeAttribute("href");
      };
      const update = () => {
        clear();
        const file = input.files?.[0];
        button.disabled = !file || !supported || file.size > maximumFileBytes;
        output.textContent = file
          ? file.size > maximumFileBytes
            ? "This file exceeds the 10 MB processing limit."
            : `Ready to ${mode.value} ${file.name}.`
          : "Choose a file to get started.";
      };
      input.addEventListener("change", update, { signal: context.signal });
      mode.addEventListener("change", update, { signal: context.signal });
      filename.addEventListener(
        "input",
        () => {
          download.download = filename.value.trim() || "download.bin";
        },
        { signal: context.signal },
      );
      form.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
          const file = input.files?.[0];
          if (!file || !supported) return;
          clear();
          const current = new AbortController();
          operation = current;
          button.disabled = true;
          output.textContent = "Processing in your browser…";
          const selectedMode = mode.value === "decompress" ? "decompress" : "compress";
          void processGzip(file, selectedMode, current.signal)
            .then(async (blob) => {
              const originalName =
                selectedMode === "decompress" ? await readGzipFilename(file) : "";
              if (context.signal.aborted || current.signal.aborted) return;
              downloadUrl = URL.createObjectURL(blob);
              filename.value =
                selectedMode === "compress"
                  ? `${file.name}.gz`
                  : originalName || file.name.replace(/\.gz$/i, "") || "unzipped-file";
              download.href = downloadUrl;
              download.download = filename.value;
              download.hidden = false;
              outputLabel.hidden = false;
              output.textContent = `Ready to download: ${file.size.toLocaleString()} bytes → ${blob.size.toLocaleString()} bytes.`;
            })
            .catch((error: unknown) => {
              if (!context.signal.aborted && !current.signal.aborted)
                output.textContent =
                  error instanceof Error && error.message.includes("limit")
                    ? error.message
                    : "This file could not be processed. Check that decompression input is a valid gzip file.";
            })
            .finally(() => {
              if (!context.signal.aborted && operation === current) button.disabled = false;
            });
        },
        { signal: context.signal },
      );
      context.signal.addEventListener("abort", release, { once: true });
    },
    unmount() {
      release();
      host?.remove();
      host = undefined;
    },
  };
}

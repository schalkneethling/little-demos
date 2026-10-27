export type AssetLoadState = "ready" | "fallback";
export type AssetLoadStates = Record<string, AssetLoadState>;

interface PendingImageLoad {
  xhrLoader: XMLHttpRequest | null;
  data: unknown;
  onProcessComplete(): void;
  onProcessError(): void;
}

/** Cancel before Loader.reset; reset alone does not detach XHR/decode callbacks. */
export function cancelPendingImage(
  file: PendingImageLoad,
  revoke: (url: string) => void = (url) => URL.revokeObjectURL(url),
) {
  // A previously queued image callback can still run: make its completion inert.
  file.onProcessComplete = () => {};
  file.onProcessError = () => {};
  const xhr = file.xhrLoader;
  if (xhr) {
    xhr.onload = null;
    xhr.onerror = null;
    xhr.onprogress = null;
    xhr.ontimeout = null;
    xhr.onabort = null;
    xhr.onreadystatechange = null;
    xhr.abort();
  }
  const data = file.data;
  if (data && typeof data === "object" && "src" in data && typeof data.src === "string") {
    if ("onload" in data) data.onload = null;
    if ("onerror" in data) data.onerror = null;
    if (data.src.startsWith("blob:")) revoke(data.src);
    if ("removeAttribute" in data && typeof data.removeAttribute === "function")
      data.removeAttribute("src");
  }
  // Do not destroy the File: a queued handler may still close over file.data.
}

export function resolveAssetState(
  textureExists: boolean,
  frames: { columns: number; rows: number } | undefined,
  frameExists: (index: number) => boolean,
): AssetLoadState {
  if (!textureExists) return "fallback";
  if (frames) {
    for (let index = 0; index < frames.columns * frames.rows; index++) {
      if (!frameExists(index)) return "fallback";
    }
  }
  return "ready";
}

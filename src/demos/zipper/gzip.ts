export const maximumFileBytes = 10 * 1024 * 1024;

export async function readGzipFilename(source: Blob): Promise<string> {
  // Read only a small header, never allocate the entire source for metadata.
  const header = source.slice(0, 512);
  if (header.size > 512) return "";
  const bytes = new Uint8Array(await header.arrayBuffer());
  if (
    bytes.byteLength > 512 ||
    bytes.length < 10 ||
    bytes[0] !== 0x1f ||
    bytes[1] !== 0x8b ||
    bytes[2] !== 8 ||
    !(bytes[3]! & 8)
  )
    return "";
  let offset = 10;
  if (bytes[3]! & 4) {
    if (bytes.length < 12) return "";
    offset += 2 + bytes[10]! + (bytes[11]! << 8);
  }
  const end = bytes.indexOf(0, offset);
  if (end < offset) return "";
  return (
    new TextDecoder("iso-8859-1")
      .decode(bytes.subarray(offset, end))
      .split(/[\\/]/)
      .pop()
      ?.trim() ?? ""
  );
}

/** Enforce the source bound before reading and the output bound before retaining chunks. */
export async function processGzip(
  source: Blob,
  mode: "compress" | "decompress",
  signal: AbortSignal,
  limit = maximumFileBytes,
): Promise<Blob> {
  signal.throwIfAborted();
  if (source.size > limit) throw new Error("This file exceeds the 10 MB processing limit.");
  const transform =
    mode === "compress" ? new CompressionStream("gzip") : new DecompressionStream("gzip");
  const reader = source.stream().pipeThrough(transform).getReader();
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error("The result exceeds the 10 MB processing limit.");
      }
      chunks.push(new Uint8Array(value));
    }
    const result = new Blob(chunks, {
      type: mode === "compress" ? "application/gzip" : "application/octet-stream",
    });
    if (result.size > limit) throw new Error("The result exceeds the processing limit.");
    return result;
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}

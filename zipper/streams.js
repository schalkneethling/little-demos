export const maximumFileBytes = 10 * 1024 * 1024;

export async function transformGzip(file, decompress = false, limit = maximumFileBytes) {
  if (file.size > limit) throw new Error("This file exceeds the 10 MB processing limit.");
  const transform = decompress ? new DecompressionStream("gzip") : new CompressionStream("gzip");
  const reader = file.stream().pipeThrough(transform).getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error("The result exceeds the 10 MB processing limit.");
      }
      chunks.push(value);
    }
    const blob = new Blob(chunks);
    if (blob.size > limit) throw new Error("The result exceeds the 10 MB processing limit.");
    return blob;
  } finally {
    reader.releaseLock();
  }
}

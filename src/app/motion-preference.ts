const key = "little-demos:motion";

export function readMotionOverride(storage: Pick<Storage, "getItem">): boolean | null {
  try {
    const value = storage.getItem(key);
    if (!value || value.length > 256) return null;
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      "version" in parsed &&
      parsed.version === 1 &&
      "reducedMotion" in parsed &&
      parsed.reducedMotion === true
    )
      return true;
  } catch {
    /* Storage denial leaves system preferences in control. */
  }
  return null;
}

export function writeMotionOverride(storage: Pick<Storage, "setItem">): void {
  try {
    storage.setItem(key, JSON.stringify({ version: 1, reducedMotion: true }));
  } catch {
    /* An explicit preference still works for this session. */
  }
}

export function clearMotionOverride(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(key);
  } catch {
    /* Clearing the session preference still takes effect when storage is denied. */
  }
}

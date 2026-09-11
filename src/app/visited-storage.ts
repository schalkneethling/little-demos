const key = "little-demos:visited";
const maximumLength = 4096;

export function readVisited(
  storage: Pick<Storage, "getItem">,
  knownIds: ReadonlySet<string>,
): Set<string> {
  try {
    const value = storage.getItem(key);
    if (!value || value.length > maximumLength) return new Set();
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("ids" in parsed) ||
      !Array.isArray(parsed.ids)
    )
      return new Set();
    return new Set(
      parsed.ids.filter((id): id is string => typeof id === "string" && knownIds.has(id)),
    );
  } catch {
    return new Set();
  }
}

export function writeVisited(storage: Pick<Storage, "setItem">, ids: ReadonlySet<string>): void {
  try {
    storage.setItem(key, JSON.stringify({ version: 1, ids: [...ids] }));
  } catch {
    // A private or full store must not prevent opening and closing demos.
  }
}

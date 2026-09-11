import { describe, expect, test } from "vite-plus/test";
import { readVisited, writeVisited } from "../../src/app/visited-storage";

describe("visited persistence", () => {
  const known = new Set(["zipper", "dynamic-javascript-imports"]);
  test("accepts only known IDs from the current version", () => {
    expect(
      readVisited({ getItem: () => '{"version":1,"ids":["zipper","unknown",4,"zipper"]}' }, known),
    ).toEqual(new Set(["zipper"]));
  });
  test("ignores corrupt, oversized, old-version, and unavailable storage", () => {
    for (const value of ["invalid", '{"version":2,"ids":["zipper"]}', "x".repeat(5000), "null"]) {
      expect(readVisited({ getItem: () => value }, known).size).toBe(0);
    }
    expect(
      readVisited(
        {
          getItem: () => {
            throw new Error("Unavailable");
          },
        },
        known,
      ).size,
    ).toBe(0);
    expect(() =>
      writeVisited(
        {
          setItem: () => {
            throw new Error("Unavailable");
          },
        },
        new Set(["zipper"]),
      ),
    ).not.toThrow();
  });
});

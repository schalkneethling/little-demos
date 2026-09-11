import { describe, expect, test } from "vite-plus/test";
import { createDiagnosticsThrottle } from "../../src/world/diagnostics.ts";

describe("world diagnostics throttle", () => {
  test("reports immediately, then at most once per interval", () => {
    const throttle = createDiagnosticsThrottle(500);

    expect(throttle.shouldReport(0)).toBe(true);
    expect(throttle.shouldReport(499)).toBe(false);
    expect(throttle.shouldReport(500)).toBe(true);
    expect(throttle.shouldReport(750)).toBe(false);
    expect(throttle.shouldReport(1_000)).toBe(true);
  });
});

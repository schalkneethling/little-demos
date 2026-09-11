import { expect, test } from "vite-plus/test";
import { assertNoCatalogErrors } from "../../src/app/catalog-diagnostics";

test("valid catalog diagnostics allow startup", () => {
  expect(() => assertNoCatalogErrors([])).not.toThrow();
});

test("invalid catalogs fail with all actionable diagnostics together", () => {
  expect(() => assertNoCatalogErrors(["Missing demo: arcade", "Duplicate ID: funhouse"])).toThrow(
    "Invalid fairground catalog:\n- Missing demo: arcade\n- Duplicate ID: funhouse",
  );
});

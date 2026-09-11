import type { Catalog } from "../../src/catalog/catalog";
import { validateCatalog } from "../../src/catalog/validate-catalog";
import type { DemoDefinition } from "../../src/demos/demo-types";
import type { AttractionDefinition } from "../../src/world/attractions/attraction-types";
import type { AssetDefinition } from "../../src/world/assets/asset-registry";
import type { FairgroundMap } from "../../src/world/map/fairground-map";
import { assertNoCatalogErrors } from "../../src/app/catalog-diagnostics";

/** An isolated registration for tests: never mutates process-wide production registries. */
export function withTemporaryDemo(
  catalog: Catalog,
  map: FairgroundMap,
  registration: {
    demo: DemoDefinition;
    attraction?: AttractionDefinition;
    asset?: AssetDefinition;
  },
): Catalog {
  const result: Catalog = {
    demos: [...catalog.demos.map((demo) => ({ ...demo })), { ...registration.demo }],
    attractions: structuredClone([
      ...catalog.attractions,
      ...(registration.attraction ? [registration.attraction] : []),
    ]),
    assets: structuredClone([
      ...catalog.assets,
      ...(registration.asset ? [registration.asset] : []),
    ]),
  };
  assertNoCatalogErrors(validateCatalog(result, map));
  return result;
}

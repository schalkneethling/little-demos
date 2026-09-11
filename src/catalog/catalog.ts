import { demos } from "../demos/demo-registry";
import type { DemoDefinition } from "../demos/demo-types";
import { ASSETS, type AssetDefinition } from "../world/assets/asset-registry";
import { ATTRACTIONS } from "../world/attractions/attraction-registry";
import type { AttractionDefinition } from "../world/attractions/attraction-types";

export interface Catalog {
  attractions: readonly AttractionDefinition[];
  demos: readonly DemoDefinition[];
  assets: readonly AssetDefinition[];
}

export const CATALOG: Catalog = { attractions: ATTRACTIONS, demos, assets: ASSETS };

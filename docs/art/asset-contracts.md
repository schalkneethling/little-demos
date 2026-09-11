# Phase 4 asset contracts

## Status and approval gate

This document is the proposed PR1 contract for Phase 4. It specifies the smallest
source, export, inventory, and runtime boundary needed to replace one grey-box area
without coupling artwork to interaction code. It deliberately does not authorize an
asset pipeline implementation, generated production files, or production artwork.

The coordinating review accepted the contracts below for implementation. Every
number in [Provisional budgets](#provisional-budgets) is a proposal to measure during
the one-area proof and either accept or revise with recorded evidence. PR2 enforces
these provisional limits; raising them requires review. The user approved the visual direction on 2026-09-11.

## Coordinate and placement contract

- World coordinates and runtime image coordinates use logical world-pixel units at
  asset scale `1` (the Phaser world at camera zoom `1`), independent of browser page
  zoom and device-pixel ratio. There is no device-pixel-ratio asset variant in the
  first pipeline.
- Image dimensions are the natural decoded runtime dimensions. Width and height must
  be positive integers.
- Image-local coordinates start at `(0, 0)` in the top-left, with positive `x` right
  and positive `y` down. An anchor is an integer pixel point measured in that system.
  Edge anchors are valid, so `0 <= x <= width` and `0 <= y <= height`.
- A placed production object maps its image-local ground anchor to an explicit
  presentation `worldAnchor`. Its visible top-left is therefore `worldAnchor - anchor`.
  The default anchor for an upright object is bottom centre, but it must still be
  recorded rather than inferred.
- An object's default display depth is the world `y` of its presentation anchor.
  Existing `sortAnchor` remains the authoritative world-space depth point when present.
  A selected/highlight variant must have exactly the same dimensions and anchor as its
  base image, preventing interaction state from moving the object or changing depth.
- Collision shapes, interaction zones, entrance positions, and exit paths remain
  authored in world coordinates. They never derive from visible or opaque pixels.
- A sprite-sheet frame uses the same top-left pixel system within each frame. All
  frames in one sheet have equal integer dimensions and a shared ground anchor.
- A surface tile has no object anchor. Its placement origin is its top-left corner on
  the world plane; declared tile width and height are also its world repeat interval.
  Map rectangles may clip the repeated surface.

This does **not** redefine `AttractionDefinition.position`. Today it is the
placeholder's top-left corner, and `createAttractionRenderPlan` adds half the
placeholder width and height to obtain Phaser's rectangle centre. PR3 adds an optional
presentation placement such as
`presentation?: { worldAnchor: WorldPoint }` for production artwork. When it is absent,
the existing top-left placeholder layout is unchanged. For the arcade proof,
`worldAnchor` and the current `sortAnchor` are both `(360, 1060)`; the visible image
can extend above and sideways without changing the `(210, 870, 300, 190)` collision
rectangle.

The player is a separate case: Phaser currently positions its `34 x 58` rectangle by
visible centre, while its `20 x 18` physics body has offset `(7, 36)`. The resulting
body-centre/ground point is 16 world pixels below the visible centre
(`PLAYER_GROUND_OFFSET_Y`). Player-sheet metadata records its per-frame image anchor;
PR3 maps that anchor to the existing body ground point rather than assuming the
bottommost nontransparent pixel, frame centre, or a walking foot is the physics point.

## Source inventory

The author-owned inventory is the only hand-edited list of production export inputs.
The existing placeholder registry remains the fallback catalog until each key receives
a production source. A minimal TypeScript shape is shown here to remove ambiguity; PR2
may choose JSON if it validates to the same contract without executing code.

```ts
type AssetKey = `${"attraction" | "prop" | "player" | "surface" | "ui"}/${string}`;

interface CommonSourceAsset {
  key: AssetKey;
  runtimePath: string;
  output: { width: number; height: number };
  loadGroup: "initial-world" | "deferred-world";
  dependsOn: readonly AssetKey[];
  fallback: { width: number; height: number; color: `#${string}` };
}

interface TransparentRasterSource extends CommonSourceAsset {
  kind: "transparent-raster";
  sourcePath: string;
  sourceRect?: { x: number; y: number; width: number; height: number };
  contentBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    gravity: "center" | "south";
  };
  anchor: { x: number; y: number };
  frames?: {
    columns: number;
    rows: number;
    frameWidth: number;
    frameHeight: number;
    sourceRects: readonly { x: number; y: number; width: number; height: number }[];
  };
}

interface DeterministicSurfaceSource extends CommonSourceAsset {
  kind: "deterministic-surface";
  recipePath: string;
  seed: number;
  alphaMode: "opaque-fill" | "transition-mask";
}

type AssetSourceDefinition = TransparentRasterSource | DeterministicSurfaceSource;
```

`sourcePath`, `recipePath`, and `runtimePath` are repository-relative normalized paths:
no absolute paths, `..` components, URL schemes, backslashes, or resolution through a
symbolic link. Source artwork and recipes live below `art/source/`; optimized outputs
live below `src/assets/runtime/`. A generated manifest lives beside the runtime outputs
and is not hand-edited. Export never overwrites the source.

Keys use lower-case slash-separated namespaces with kebab-case segments, for example
`attraction/arcade/base`, `attraction/arcade/selected`, `surface/ground/grass-a`, and
`player/walk`. Runtime paths mirror keys and add the file extension. Keys describe
semantic identity, not a content hash or revision. Changing artwork in place therefore
does not require interaction-data edits.

Production raster sources are authored at the art direction's proposed 2x scale.
`sourceRect` is an explicit measured crop in native source pixels. The exporter
contain-fits that crop into the declared 1x logical `contentBox`, with transparent
letterboxing and no stretching or implicit alpha trim. A sheet instead supplies one
row-major `sourceRect` per frame and normalizes each frame independently into the same
per-frame content box. The 2.3 MB
`docs/art/concepts/arcade-direction-v1.png` is concept/reference material, not an
inventory source or runtime input. It is excluded from every runtime transfer, decode,
and request total and is not evaluated against the pipeline's source/runtime file
caps.

Every dependency is another inventory key. Dependencies must exist, be unique, must
not point to the entry itself, and must form an acyclic graph. An `initial-world` entry
may not depend on a `deferred-world` entry. A selected variant declares its base image
as a dependency. The inventory must cover, before broad production begins, the plan's
ground, paths, edges/corners, entrance, fences, lamps, seating, vegetation, signs,
waste bins, attraction exteriors and highlights, player sheet, construction treatment,
and ambient props. An entry may remain a labelled placeholder until its production
source exists, but it remains in the existing placeholder registry rather than
claiming a nonexistent export in the production-source inventory. PR3 resolves asset
keys across the generated runtime entries and retained placeholder entries; every
attraction and dependency reference must resolve in that merged catalog.

## Export and runtime manifest

Transparent object, prop, attraction, highlight, UI, and player artwork exports as a
transparent PNG in the first pipeline. The exporter preserves the declared canvas,
alpha, dimensions, and anchor; it must not trim transparent padding implicitly.
Lossy formats and resolution variants require measurements and a contract amendment.
Critical names, instructions, or status text remain semantic HTML and are never baked
into a raster.

Ground and path textures are a distinct `deterministic-surface` class. Their runtime
PNG is generated from a versioned recipe plus the recorded integer seed. A base/fill
declares `opaque-fill` and must decode fully opaque; an edge, corner, apron, or path
transition may declare `transition-mask` and must contain an alpha channel so it can be
composed over the existing ground. This alpha declaration does not turn the tile into
an independently positioned object and gives it no ground anchor.
Given the same source, recipe, seed, exporter version, and optimizer version, export
must produce the same pixels. The manifest records both output-byte and decoded-pixel
hashes so encoder metadata changes can be distinguished from visual changes. Concept
art and generative images may guide a recipe, but are not accepted directly as runtime
ground tiles: repeatability and seam checks must be deterministic.

PR2 implements only the approved `speckle-v1` opaque-fill recipe used by grass and
clay. It rejects `transition-mask` rather than guessing a transition algorithm. The
contract reserves that alpha mode for a later versioned recipe and tests before path
edges/corners enter production.

The exporter generates, but never evaluates at runtime, an entry equivalent to:

```ts
interface RuntimeAssetDefinition {
  key: AssetKey;
  kind: "transparent-raster" | "deterministic-surface";
  url: string;
  loadGroup: "initial-world" | "deferred-world";
  width: number;
  height: number;
  anchor?: { x: number; y: number };
  alphaMode?: "opaque-fill" | "transition-mask";
  frames?: { columns: number; rows: number; frameWidth: number; frameHeight: number };
  dependsOn: readonly AssetKey[];
  transferBytes: number;
  decodedBytes: number;
  outputSha256: string;
  pixelSha256: string;
  fallback: { width: number; height: number; color: number };
}
```

Generated URLs are static `new URL("./path.png?no-inline", import.meta.url).href`
expressions. `?no-inline` keeps even small textures as measurable runtime requests
instead of silently converting them to JavaScript data URLs.

`decodedBytes` is the comparable budget proxy `width * height * 4` for an RGBA decode;
sheet frames do not multiply it. This is not a claim about exact browser or GPU memory,
which may include retained compressed data, row alignment, copies, and mipmaps. The
generated manifest must be stably sorted by key and contain no timestamps, host paths,
or other nondeterministic fields.

An export succeeds only when all of these checks pass:

1. Inventory schema, key, path, uniqueness, dependency, and load-group checks.
2. Source existence and type checks, followed by bounded reads as defined below.
3. Successful decode, declared-versus-decoded dimensions, alpha/opacity rules, anchor
   bounds, sheet-grid arithmetic, finite integer seed checks, and kind-specific alpha
   checks.
4. Transparent-border preservation for anchored raster objects and opposite-edge seam
   equality for surfaces declared repeatable. Transition masks additionally check that
   transparent and nontransparent samples both exist and that composed tile edges match
   their declared neighbours.
5. Runtime filename, encoded size, decoded-memory, hash, and aggregate-budget checks.
6. A second validation pass over the generated manifest and runtime files before they
   may be committed or consumed by the app.

### Bounded-read validation

Validation must reject input before allocation, not after a full read. For each
inventory, source, recipe, and runtime file it must:

1. Normalize and containment-check the path.
2. Use `lstat` before reading; reject symbolic links and non-regular files.
3. Reject a reported byte size over the applicable cap before reading or decoding.
4. Read through a bounded API or file descriptor and abort if accumulated bytes cross
   the cap. After the read, check the actual `byteLength` again to cover file races and
   encoding differences; optionally compare a second `fstat` identity and size.
5. Only then parse text or invoke an image decoder. Pixel allocation is additionally
   guarded by the declared and decoder-reported dimension and decoded-byte caps.

The proposed pre-read caps are 256 KiB per inventory/recipe text file, 64 MiB per
source-art file, and 2 MiB per optimized runtime image. A runtime image is also capped
at `2048 x 2048` and 16 MiB decoded; a source decode is capped at 16,777,216 pixels
(64 MiB RGBA). Aggregate decoded/file-count budgets are checked from inventory
dimensions before any image generation. Source crops must contain alpha with both
fully transparent and visible pixels. Every runtime frame's outer border must have
alpha no greater than `8 / 255`, the documented antialiasing tolerance. Input and
output ancestor paths are checked for symbolic links, and runtime paths are restricted
to query-free/hash-free kebab-case `.png` paths below `src/assets/runtime/` before any
write or check-mode read. These are validation ceilings as well as budget inputs; an
oversized file fails export instead of being read and warned about later.

## Provisional budgets

These proposals cover image assets only. They do not hide the existing approximately
361.90 KiB-gzip Phaser/world JavaScript optimization target recorded after Phase 3,
and demo chunks remain independently lazy-loaded.

| Scope                                                                | Transfer proposal | Decoded RGBA proposal |      Other proposal |
| -------------------------------------------------------------------- | ----------------: | --------------------: | ------------------: |
| One fully replaced proof area, including shared assets it introduces |        <= 600 KiB |             <= 16 MiB | <= 10 runtime files |
| `initial-world` image set                                            |       <= 1.25 MiB |             <= 24 MiB |      <= 16 requests |
| All world images loaded/resident                                     |          <= 4 MiB |             <= 48 MiB |      <= 40 requests |
| One runtime image                                                    |          <= 2 MiB |             <= 16 MiB |      <= 2048 x 2048 |

Transfer totals are encoded file byte sizes, because PNG is already compressed; they
must not be reported as a second gzip estimate. Aggregate decoded totals count each
unique resident texture once. PR2 records actual proof-area totals, export duration,
request count, and any visible-quality tradeoff. Raising a proposal requires review;
silently weakening a validator does not.

## Errors, diagnostics, and fallbacks

- Invalid source inventory, failed export, nondeterministic output, failed seam/alpha
  checks, missing dependencies, or exceeded ceilings are hard PR2/CI failures. The
  pipeline must not publish a partial manifest.
- Catalog validation remains pure and must reject invalid runtime metadata, duplicate
  keys, dangling attraction/highlight references, bad dependency graphs, incompatible
  highlight variants, impossible anchors/frames, and visible bounds outside the map.
- A runtime fetch or decode failure is reported once with the asset key and reason.
  Attraction, prop, player, and surface rendering substitute the entry's labelled
  geometric fallback; an unavailable selected variant uses the base image plus the
  existing programmatic selection outline. Interaction, collision, and the semantic
  directory continue to work because none depends on image pixels.
- Initial assets may load in dependency order, but a failed asset does not block
  unrelated entries. `world-ready` is emitted after every initial entry is either
  decoded or replaced by its fallback, never while waiting for deferred artwork.
- If Phaser/canvas initialization itself fails, the currently implemented world-error
  path keeps the semantic shell and directory available. Phase 4 must preserve that
  behavior; Phase 7 may strengthen and test additional rendering-failure cases.

## Dependency sequence

| Pull request                | Depends on                      | Deliverable and gate                                                                                                                                                                           |
| --------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR1: contracts              | Phase 3 catalog/render baseline | This reviewed document only; explicit approval of contract and provisional budgets                                                                                                             |
| PR2: pipeline and proof art | Approved PR1                    | Source inventory, bounded deterministic exporter/optimizer, generated manifest, validation tests, and one production-quality area; measured budget report; no broad artwork run                |
| PR3: runtime integration    | Approved PR2 outputs            | Phaser loading and fallback behavior, image/sheet/tile rendering, optional presentation-anchor semantics, catalog/runtime validation, visual regression mode, and regression/performance tests |

PR2 must prove that source art can be replaced and re-exported deterministically
without editing interaction definitions. PR3 must prove the generated manifest can be
integrated without deriving collision or text from artwork. Producing the remaining
world art follows only after both gates pass.

## Exact current interfaces to change later

No item in this section is changed by PR1.

- `src/world/assets/asset-registry.ts`: `AssetDefinition` currently contains only
  `key` and `placeholder`; `ASSETS` and `ASSET_BY_KEY` must eventually consume generated
  runtime metadata while retaining the placeholder fallback.
- `src/world/attractions/attraction-types.ts`: `AttractionDefinition.position` is
  currently interpreted as visible top-left, while `assetKey`, `highlightAssetKey`,
  and optional world `sortAnchor` select placeholder metadata. PR3 preserves those
  meanings and adds an optional production-art presentation `worldAnchor`, avoiding a
  registry-wide geometry migration for the one-area proof.
- `src/catalog/catalog.ts`: `Catalog.assets` currently exposes placeholder-only
  `AssetDefinition[]`; it must expose the generated runtime definitions without
  importing Phaser or source/export tooling.
- `src/catalog/validate-catalog.ts`: `validateCatalog` currently validates placeholder
  width/height/color and computes visible bounds by spreading `attraction.position`
  with `asset.placeholder`. It must validate the runtime contract, dependency graph,
  variant compatibility, and anchor-derived visible bounds while retaining bounded
  reachability allocation.
- `src/world/rendering/attraction-render-plan.ts`: the private
  `PlaceholderAssetDefinition`, rectangle `center`/`size`, color-only visual states,
  and `position + height` default depth encode the grey-box model. The later plan must
  emit texture/frame/origin data, use `worldAnchor`/`sortAnchor` for production depth,
  and carry fallback geometry without Phaser objects.
- `src/world/scenes/boot-scene.ts`: `BootScene.create` currently starts the fairground
  immediately and has no preload path. PR3 must load `initial-world` entries and settle
  each to a texture or fallback before starting the scene.
- `src/world/scenes/fairground-scene.ts`: ground, paths, attraction structures, labels,
  and player are currently rectangles/text. PR3 replaces visual rectangles with
  manifest-driven images/sheets/repeated surfaces while retaining collision bodies,
  semantic DOM labels, selection diagnostics, and placeholder fallback behavior.
- `src/world/map/fairground-map.ts`: `FairgroundMap.paths` are geometry rectangles.
  They remain geometry, but PR3 renders deterministic ground/path tiles clipped to
  those rectangles rather than making texture pixels authoritative.
- Tests using placeholder literals in `tests/catalog/validate-catalog.test.ts`,
  `tests/world/attraction-render-plan.test.ts`, `tests/runtime/temporary-demo.test.ts`,
  and `tests/helpers/temporary-demo.ts` must migrate with PR3 and add generated-manifest,
  anchor, dependency, fallback, and budget cases.

# Production art sources

The user approved the [miniature-fairground visual direction](../../docs/art/phase-4-art-direction.md)
on 2026-09-11. These are the first arcade-area export inputs, kept separate from
optimized runtime output. The [concept image](../../docs/art/concepts/arcade-direction-v1.png)
is a reference, not a source texture or a flattened world background.

## Inventory and scope

`inventory.json` is the hand-edited input list. The exporter owns the generated
runtime manifest and PNG files below `src/assets/runtime/`; never patch those files
to change art. Replacing a source and re-exporting must not require changes to
attraction interactions, collision geometry, or demo labels.

| Key                      | Source                 | Runtime pixels                  | Placement                                                                  |
| ------------------------ | ---------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| `attraction/arcade/base` | `arcade.png`           | 320 × 310                       | Ground anchor (160, 310); existing world anchor (360, 1,060)               |
| `player/walk`            | `player-walk-v2.png`   | 136 × 232 sheet; 34 × 58 frames | Per-frame ground anchor (17, 45), mapped to the existing body ground point |
| `prop/planter`           | `planter.png`          | 28 × 28                         | Ground anchor (14, 28)                                                     |
| `surface/ground/grass-a` | `recipes/grass-a.json` | 128 × 128                       | Top-left tile origin; 128-pixel repeat interval                            |
| `surface/path/clay`      | `recipes/clay.json`    | 128 × 128                       | Top-left tile origin; clipped to existing path rectangles                  |

This proof has five runtime image files. Their aggregate ceilings are 600 KiB
encoded transfer and 16 MiB decoded RGBA, with at most ten image files permitted by
the approved proof-area budget. The decoded-dimension estimate for this inventory
is 657,216 bytes: each texture's width × height × 4, counted once, including the
whole player sheet rather than multiplying it by frame count. This is a planned
estimate, not a measured export or GPU-memory claim. Record actual output sizes,
hashes, export duration, and validation results after export.

Do not add benches, lamps, fences, additional attractions, or ambient characters
to this initial inventory. Runtime selection/visited marks and contact shadows may
be programmatic in PR3; no corresponding PNG is needed here. A planter's placement
must not introduce a solid-looking obstacle in an existing traversable route.

## Raster provenance

`arcade.png`, `player-walk-v2.png`, and `planter.png` are individually generated production
source images based on the approved handcrafted visual language. Keep the original
source files. Their generation prompts, reference images, and native dimensions are
recorded in [provenance.md](./provenance.md). Do not label a source hand-painted or
human-authored when it was generated.

The retained native sources are 1,254 × 1,254 for the arcade and planter and
1,246 × 1,263 for the player. The earlier 960 × 1,639 `player.png` is retained as a
non-runtime source revision; v2 corrects its weak opposing-foot walk poses. This is
an explicit exception to the proposed exact
2× authoring canvases: the generated originals are preserved and exported through
declared crops. The inventory uses measured alpha-greater-than-10 bounds padded by
two source pixels on every side. Arcade crop: (76, 75), 1,101 × 1,059. Planter crop:
(299, 246), 657 × 772. The player declares its full native canvas and sixteen
individually measured, two-pixel-padded frame crops. These fixed rectangles are
author-owned metadata; export must not rediscover alpha bounds or trim differently
between runs.

Each explicit `sourceRect` is contain-fitted, without distortion, into a declared
output `contentBox` on a transparent canvas. The arcade content box is (2, 2),
316 × 306; the planter box is (1, 1), 26 × 26. Both use south gravity. Do not
stretch an image or silently trim transparency to satisfy output dimensions.
Keep sufficient clear alpha around all exterior silhouettes and preserve the
declared frame registration.

All three rasters must have true transparent backgrounds, not checkerboard pixels.
No essential words, instructions, status indicators, ground patches, or baked
contact shadows belong in these sources. The arcade's blank sign face is deliberate:
the full demo name remains “Dynamic JavaScript Imports” in the accessible DOM.

### Player frame registration

The generated player uses a mustard hooded jacket, dark trousers, and short dark
hair; it omits the concept document's proposed cream cap. Columns are idle,
walk 1, walk 2, and walk 3. Rows are south, west, east, and north. Frames are indexed
in row-major order:

| Facing       | Idle | Walk 1 | Walk 2 | Walk 3 |
| ------------ | ---- | ------ | ------ | ------ |
| South / down | 0    | 1      | 2      | 3      |
| West / left  | 4    | 5      | 6      | 7      |
| East / right | 8    | 9      | 10     | 11     |
| North / up   | 12   | 13     | 14     | 15     |

Each sheet frame has an individually measured source rectangle in
`frames.sourceRects`, ordered as above. Its crop is contain-fitted into the
per-frame content box (2, 1), 30 × 53 with south gravity, then placed in its fixed
34 × 58 output cell. Source rectangle coordinates refer to the original source
image, not a previously cropped sheet.

The one-pixel top inset prevents the downsampled hair silhouette touching a frame
edge; the frame size and physics anchor remain unchanged.

Every frame has the same 34 × 58 logical extent and anchor (17, 45). Keep the torso
registered around that anchor while the legs vary. No walk frame may borrow pixels
from a neighboring cell. Four facing rows do not change eight-direction movement;
runtime integration selects the nearest facing and honors reduced motion. Idle
frames must work without continuous bobbing, blinking, or other decorative motion.

## Deterministic surface provenance

The ground and path recipes are project-authored numeric instructions, not generated
bitmap tiles. Their colors deliberately reuse fairground sage `#6d9a83` and warm
clay `#d8b8a0` from the existing CSS tokens. Flecks are only small value variations,
not leaves, pebbles, obstacles, or directional shadows.

Both recipes use version 1 of the exporter's `speckle-v1` algorithm:

- `baseColor`: the fully opaque base fill.
- `fleckColors`: a short list of low-contrast opaque colors.
- `fleckCount`: the number of seeded marks before periodic wrapping.
- `minRadius` and `maxRadius`: inclusive integer mark radii in output pixels.
- `version` and `algorithm`: explicit recipe compatibility identifiers.

The seed and tile output dimensions belong to the inventory entry. Grass uses seed
42117 and 48 marks of radius 1–2 pixels; clay uses seed 73019 and 32 marks of radius
1–2 pixels. These intentionally sparse marks keep the world quieter than the player
and arcade. Do not increase noise to make a source-size preview look richer.

The algorithm wraps marks periodically and verifies matching opposite edge samples.
Inspect repeated tiles, not only one isolated square. Both entries declare
`opaque-fill`; this slice adds no transition-mask recipe or procedural edge/corner
assets. Runtime clipping to existing geometry is distinct from painting a new route.

## Export boundary

Follow the [asset contracts](../../docs/art/asset-contracts.md). In particular:

- The source inventory declares crop bounds and exact runtime dimensions; anchors
  use logical output pixels, or per-frame logical pixels for the player sheet.
- Crop aspect is preserved by explicit contain-fitting into the declared content
  box. Export preserves the output canvas, transparent padding, and registration
  rather than implicitly trimming or stretching artwork.
- Source, recipe, and runtime paths are normalized repository-relative paths with
  no traversal, symbolic-link resolution, or executable recipe code.
- Check file type and size before reading, cap the read itself, recheck actual byte
  length afterward, and validate image dimensions before decoded-pixel allocation.
- Surface seeds and algorithm version must be fixed. Identical inputs and pinned
  tooling must produce identical decoded pixels and stable output metadata.
- Generated manifests record encoded and decoded hashes, byte counts, dimensions,
  anchors, frame grid, dependencies, fallback geometry, and load group. Do not add
  machine-specific paths or generation timestamps to runtime metadata.
- The five entries are `initial-world` with no dependencies. Selected and visited
  states do not require duplicate building textures.
- Readable geometric fallbacks remain independent of image decoding. The arcade's
  fallback stays 300 × 190, matching its current placeholder contract; the larger
  production artwork must not enlarge the collision body.

The inventory is not accepted solely because JSON parses. Raster alpha, visual
registration, transparent borders, surface seams, determinism, aggregate budgets,
and emitted-file validation must all pass before runtime integration consumes it.

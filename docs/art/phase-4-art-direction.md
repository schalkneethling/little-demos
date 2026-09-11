# Phase 4 art direction: the miniature arcade

Status: visual language approved by the user on 2026-09-11; production implementation remains subject to review and measured budgets.

This is the first Phase 4 approval package, not a finished production area. The
approved starting approach is a handcrafted miniature fairground, readable
near-isometric silhouettes, the existing warm UI palette, the current functional
navigation plane, and a full-viewport world. The specific treatment below and its
concept image were approved by the user. Generate separate production sprites;
never treat the concept image as a production background.

Review the [first concept image](concepts/arcade-direction-v1.png) alongside its
[generation prompt and review notes](concepts/arcade-direction-v1.md). Its foliage,
fences, lamp, and painted approach are illustrative, not approved map changes or
additional production scope. Simplify dense foliage for runtime legibility.

## Design intent

Little Demos is a place to discover working web experiments. Its first finished
area should feel like a carefully painted model arcade that someone could build
from timber, canvas, and card. The memorable element is the arcade's stepped
yellow marquee and coral scalloped awning; its surroundings stay quiet enough to
make the doorway, player, and movement routes immediately readable.

This is not a realistic theme park, a neon gaming room, or a portfolio of equally
weighted attraction cards. The existing cream and coral are intentional continuity
with this project's UI, not a new generic page theme. Retain the current interface
typography and avoid adding ornamental UI frames around the world.

## Functional map is the authority

The following are current logical world coordinates, not projected image pixels.
They are recorded from the map, attraction registry, and player geometry so that
later asset work has a stable functional reference.

| Element                    | Existing contract                                                            |
| -------------------------- | ---------------------------------------------------------------------------- |
| World                      | 1,920 × 1,280; spawn at (960, 1,120)                                         |
| Main routes                | Vertical path: (840, 0), 240 × 1,280; horizontal path: (0, 520), 1,920 × 240 |
| Upper connecting route     | (360, 180), 1,200 × 160                                                      |
| Arcade collision footprint | Rectangle at (210, 870), 300 × 190                                           |
| Arcade entrance            | (360, 1,085), below the structure                                            |
| Arcade interaction zone    | Rectangle at (270, 1,060), 180 × 110                                         |
| Arcade ground/sort anchor  | (360, 1,060)                                                                 |
| Arcade exit route          | (360, 1,085) to (360, 1,160)                                                 |
| Player visible size        | 34 × 58 logical pixels                                                       |
| Player collision body      | 20 × 18 logical pixels, offset (7, 36) within the current visible bounds     |

The arcade's approach is currently traversable ground, not an existing dedicated
path rectangle. A future decorative apron may clarify that approach, but it must
not silently change collision, trigger placement, path topology, or movement.
The other attractions remain placeholders while this one area proves the pipeline.

## Visual-language rules

### Perspective and composition

- Use an elevated three-quarter, near-isometric _visual treatment_: visible roofs,
  short upright walls, and simplified side faces. Roof bevels and small props may
  use roughly 2:1 diagonals as a shared shape cue.
- Do not rotate, skew, or reproject the current navigation plane. This is not a
  mathematically isometric tile-map migration. Building ground contact, entrance
  alignment, collision coordinates, and camera behavior remain authoritative.
- Keep the arcade's entrance on its screen-bottom/front face. Its base must read
  as the existing rectangular occupied area, without an illustrated diagonal wall
  appearing to block traversable ground.
- Keep vertical edges vertical; use a consistent view across all assets. No
  perspective convergence, independent vanishing points, or free-camera views.
- Fill the viewport with continuous world ground. Do not frame the park as a
  floating island, model on a desk, rounded illustration card, or isolated slab.
- Compose the concept around the arcade and an unobstructed player approach.
  Preserve breathing room for the existing DOM controls; do not bake interface
  panels or essential labels into the illustration.
- At runtime, route visibility and viewport cropping take precedence over matching
  a concept composition. Do not move landmarks simply to reproduce an image.

### Palette

The six principal art colors come directly from `src/styles/tokens.css`.

| Color           | Hex       | Role                                         |
| --------------- | --------- | -------------------------------------------- |
| Fairground sage | `#6d9a83` | Quiet ground and vegetation base             |
| Warm clay       | `#d8b8a0` | Paths and arcade approach                    |
| Canvas cream    | `#f8f4e9` | Fabric, pale painted trim, sign face         |
| Painted teal    | `#31777a` | Arcade walls, bins, understated prop accents |
| Signal coral    | `#bb4d42` | Awning stripes and small attraction accents  |
| Marquee yellow  | `#e5b74c` | Arcade landmark trim and player jacket       |

Use existing ink `#173449` for small dark separations and outlines. Derive restrained
light/dark material shades from these colors; do not introduce a competing neon
palette. Ground and paths occupy most of the image, with lower contrast than the
player and doorway. Color alone must never distinguish interactive or visited
states.

### Materials and edges

- Painted timber: broad flat panels, softly rounded joins, occasional visible
  board seam. No distressed grunge or dense woodgrain.
- Canvas: broad coral/cream awning stripes, a shallow scalloped hem, one or two
  restrained fold shadows. No lettering or tiny repeated stitches.
- Vegetation: cut-paper or felt-like clustered shapes, two or three value masses,
  no individual blades of grass or photoreal leaves.
- Ground: matte sage surface with sparse low-contrast flecks. Paths use compacted
  clay with a soft, clearly bounded edge; no pebbles that resemble obstacles.
- Outline only where silhouettes need separation. Target a roughly 2-logical-pixel
  outer separation on the player and major structure, and quieter internal edges.
  Do not turn every material seam into a heavy black stroke.

### Lighting

- One warm, broad light from screen upper-left. Upper/left faces are lighter;
  right faces are darker. No asset-specific light direction.
- Use short, soft contact shadows cast down-right, around 15–25% of an object's
  visible height. Avoid large shadows that resemble collision boundaries.
- Keep ground shadows in separate transparent layers beneath objects and player;
  never bake a colored ground patch into a prop sprite.
- Marquee bulbs are painted yellow dots, not an emissive nighttime effect. No
  bloom, lens flare, photoreal reflections, or animated glitter in this slice.

### Scale and silhouettes

- Author at 2× intended logical display size for consistent source detail; export
  variants only when measured runtime needs justify them. Pixel dimensions in the
  inventory below describe intended logical display size, not a promise of final
  encoded texture dimensions.
- Keep the player at the current 34 × 58 visible envelope. A mustard jacket, dark
  trousers, a simple dark hair silhouette, and distinct feet should read without facial detail.
- Give the arcade one wide central opening, about two player widths, aligned to
  the existing entrance. Two dark arcade-cabinet silhouettes can establish its
  identity without an interior scene or tiny screen graphics.
- Target a roughly 320 × 310 arcade visual envelope, bottom-centered on the
  existing sort anchor. Its occupied base must still match the 300 × 190 collision
  footprint. Any wider roof trim is overhead decoration, not a new obstacle.
- Keep nearby planters below approximately half a player's height and benches
  around one player height in width. Avoid tall foreground props around the
  approach, interaction zone, or exit route.
- Judge silhouettes at actual minimum supported zoom, not only in a large source
  image. If the player merges into a path or marquee detail becomes visual noise,
  simplify the art before enlarging or relocating functional geometry.

### Signage and interaction states

- The marquee sign face is blank in generated art. The exact demo name is
  “Dynamic JavaScript Imports”; its readable name and activation instructions
  remain available in semantic HTML through the existing application UI.
- Preserve the existing display stack: Arial Rounded MT Bold, Trebuchet MS,
  ui-rounded, then system sans-serif. Use the current body stack for explanatory
  text. No new font download is required by this direction.
- If supplemental world-space lettering is added later, render it separately from
  artwork. It is decorative/redundant, not the sole accessible demo label.
- Selection uses a stable high-contrast doorway/ground bracket plus the existing
  explicit activation prompt. Visited state adds a check-shaped badge rather than
  changing only hue. Avoid replacing the whole building texture for either state.
- Keep non-interactive props free of selection rings and doorway-like symbols.
  Entering a zone continues to select, not automatically open, the demo.
- The default concept is still. Later walking and exit motion may respond to user
  action, but the appearance and states must remain complete under reduced motion.

## First production-area inventory

These are proposed independently replaceable assets, not assets delivered by this
PR. The scope is the Dynamic JavaScript Imports arcade and enough reusable ground,
path, props, and player art to prove the pipeline. Do not produce the entire park.

| Asset group     | Proposed contents                                                                                       | Logical scale / anchor                                                        | Constraints                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Ground          | One seamless sage base and two sparse nonblocking detail patches                                        | 128 × 128 base; top-left tile origin                                          | No baked structures, shadows, or collision                                                       |
| Paths           | Clay fill, straight edge, outer corner, inner corner, and edge transition mask                          | 128 × 128 authoring cells; top-left origin                                    | Compose over existing route rectangles; rotations only if texture and light remain consistent    |
| Arcade approach | Shallow clay apron/threshold decal                                                                      | Fit inside the existing approach/interaction space; explicit placement origin | Ground decoration only; keep the full exit corridor legible                                      |
| Arcade exterior | One teal pavilion, cream/coral awning, yellow stepped marquee, blank sign face, two cabinet silhouettes | Target 320 × 310; bottom-center at (360, 1,060)                               | Separate visible bounds from the existing collision footprint                                    |
| Arcade shadow   | Soft ground-contact shadow                                                                              | Share the exterior's ground anchor                                            | Below all y-sorted objects; no baked ground color                                                |
| Arcade states   | Selection bracket and visited check badge                                                               | Align to existing entrance / separately documented overlay origin             | Separate state layers; no critical baked words or color-only meaning                             |
| Low planter     | One compact leafy planter, reused sparingly                                                             | About 28 × 28; base center                                                    | Outside all approach, exit, and narrow-route clearance                                           |
| Bench           | One painted timber bench                                                                                | About 58 × 30; base center                                                    | No new solid-looking obstacle without separately reviewed collision data                         |
| Waste bin       | One simple teal bin                                                                                     | About 18 × 26; base center                                                    | Same placement/collision constraint as bench                                                     |
| Player          | Idle and walking sheet in four facing directions, with diagonal movement reusing the nearest facing     | 34 × 58 per displayed frame; fixed per-frame ground anchor                    | Preserve current body dimensions/offset; consistent registration and no idle bobbing requirement |
| Player shadow   | One small soft ellipse                                                                                  | Approximately the existing 20 × 18 body footprint; body-center ground anchor  | Separate from animation frames and y-sorted sprite                                               |

Four-facing art does not reduce existing eight-direction movement. Final frame
count and atlas dimensions are production decisions after concept approval and
budget checks; a proposed starting point is one idle and four walk frames per
facing. No entrance arch, Ferris wheel, carousel, construction plot, additional
attraction exterior, ambient character, or decorative animation is required to
approve this slice.

## Production handoff after approval

- Keep the concept image and editable sources outside the runtime asset tree.
  Runtime art must be independently exported pieces, never a flattened concept.
- Record source scale, transparent trim/padding, logical display bounds, ground
  anchor, collision association, and export settings for every asset. Tile origins
  differ from object ground anchors and must be explicit.
- Keep collision shapes as authored world data. Never infer bodies from opaque
  pixels or automatically change them when replacing textures.
- Retain the current player geometry's ground-anchor relationship. Do not assume
  that the bottommost transparent row or a walking foot is the physics anchor.
- Test sorting on both sides of the arcade anchor, selection/visited overlays,
  doorway visibility, and player motion across the entire existing exit route.
- Review alpha edges against both ground and clay, tile seams, minimum-zoom
  legibility, full-viewport cropping, reduced motion, and accessible DOM labels.
- Confirm transfer/decode budgets against the project's performance baseline
  before approving atlas packing or additional resolution variants.

## Approval checklist

The user should approve or revise the concept's perspective treatment, material
feel, arcade silhouette, player proportions, and palette before runtime art begins.
Specifically confirm that the image communicates a full-viewport explorable world,
not a new rotated map or a static illustration.

The next implementation stage must prove one complete production-quality arcade
area and its export pipeline. This document and a pleasing concept image alone do
not satisfy the Phase 4 exit criteria.

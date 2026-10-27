# Phase 5 fairground art

The approved three-quarter miniature reference remains authoritative. The world
uses six interactive plots, a coming-soon tent, and a central fountain. Repeated
arcade/tent modules deliberately share materials and geometry; they are not six
bespoke illustrations. Names remain in the semantic directory and active DOM
prompt, never baked into images or restored as floating world labels.

## Exports and budget

Four new transparent sources live in `art/source/`: `carousel-v1.png`,
`ferris-wheel-v1.png`, `tent-v1.png`, and `fountain-v1.png`. Crops, dimensions,
anchors, runtime paths and fallbacks are recorded in `inventory.json`. The
existing bounded exporter validates alpha, dimensions and allocation limits.

Nine runtime PNGs total **652,906 transfer bytes** and **2,092,832 decoded RGBA
proxy bytes**. The complete fairground uses the already established initial-world
budget (1.25 MiB transfer, 24 MiB decoded, 16 files), not Phase 4's single-area
600 KiB proof budget. Isolated exporter callers retain the original proof
defaults. Resident limits and all per-file allocation guards remain unchanged.
Derived silhouette glow textures are additional runtime allocations, shared
per artwork key. They are not counted as transferred PNGs.

The entrance sign and state medallions are simple code-native graphics. Two
generated entrance arches were rejected for surrounding haze instead of clean
alpha; neither is a project asset. No player sheet replacement is claimed.

## Generation provenance

Built-in image generation, 2026-09-19. Reference for all four accepted assets:
`docs/art/concepts/arcade-direction-v1.png`, used only for style and camera.
The original generated files remain in the Codex image directory; accepted
sources were copied into this repository, then processed by its export pipeline.

Final prompts:

### Carousel

> Use case: stylized-concept. Generate ONE isolated carousel pavilion game sprite,
> genuine transparent background. Input is STYLE AND CAMERA REFERENCE only.
> Match elevated three-quarter orthographic view showing roof and right side,
> warm handcrafted painted miniature, teal timber #31777a, coral #bb4d42 and cream
> #f8f4e9 striped canopy, mustard #e5b74c finial, dark ink structural details.
> A compact fairground carousel with 3 visible carved horses on a low oval wooden
> platform, full structure uncropped, centered with generous alpha margin. Clear
> charming silhouette legible at 280x280 pixels. No people, environment, ground
> plane, exterior cast shadow, text, UI, outline rectangle, checkerboard or opaque
> background. Separate single asset not a sheet.

### Tent

> Use case: stylized-concept. Single isolated fairground tent pavilion sprite,
> genuine transparent background. Reference is style/camera reference only.
> Elevated three-quarter orthographic miniature matching teal timber/coral cream
> canvas/mustard details and painterly materials. Compact octagonal striped
> coral-and-cream big-top with teal entrance frame, raised mustard flag, open dark
> south-facing doorway and short wooden threshold, right side visible. A layered
> scalloped canopy silhouette suggests a layer cake, no actual food or words.
> Full object uncropped centered generous alpha margins. No people, ground/landscape,
> external shadow, opaque background/checkerboard, UI or labels. Legible at
> 280x280 runtime.

### Ferris wheel

> Use case: stylized-concept. Single isolated small fairground Ferris wheel game
> sprite on genuine transparent background. Input reference STYLE and elevated
> three-quarter orthographic camera only, NOT same building silhouette. A lovely
> compact Ferris wheel with teal metal/timber A-frame supports, cream spokes, six
> coral and mustard passenger gondolas, simple low wooden base platform. Wheel
> plane angled in threequarter view with visible depth, warm painted handcrafted
> miniature textures matching reference. Full wheel and feet centered uncropped
> generous transparent margins. No people, text, UI, landscape, exterior cast
> shadow, checkerboard or opaque background. Runtime size280x320, clear readable
> shapes.

### Fountain

> Use case: stylized-concept. Single isolated central fairground landmark fountain
> sprite, genuine transparent background. Reference is STYLE AND CAMERA reference
> only. Elevated three-quarter orthographic miniature, warm painterly cream stone
> octagonal basin with low rim, teal water and small tiered mustard-and-cream
> central pedestal topped by a gold ball. A little sage foliage around basin rim,
> no external plants. Visible top water ellipse and right/front stone sides,
> restrained elegant detail, coherent with teal timber/coral cream fairground.
> Full object centered uncropped with generous alpha margins. No people, buildings,
> text, UI, ground plane, cast shadow, checkerboard or opaque background. Legible
> at 260x210 runtime. Still water, no elaborate airborne spray.

Final export dimensions, including the larger fountain envelope, are authoritative
in the inventory rather than generation prompt suggestions. Collision is authored
independently of every image.

## Navigation and motion

The Cartesian 1920 × 1280 map and 220-unit/s movement remain. The footprint
tests check both side routes around the plaza, every entrance and exit, and all
path rectangles against solid geometry. A full-width crossing is approximately
8.7 seconds before obstacles. Existing camera dead zone (180 × 130), follow
easing and manual camera controls remain; reduced motion follows immediately.

Four low-amplitude decorative lights stop animating under reduced motion and
in visual fixtures. There is no auto-playing audio or attraction motion. Visited
check medallions supplement the persistent, explicit DOM visited text.

The wider landscape remains modular and rectilinear; organic terrain transitions,
denser foliage, a less stylized player and unique exteriors for every demo remain
art refinements, not claims made by this pass.

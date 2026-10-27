# PR3 integration and regression plan

Status: implementation plan, not evidence of passing tests. PR2 owns exports and
proof assets; PR3 consumes the reviewed generated manifest. This document proposes
the minimum runtime changes for the arcade slice without moving navigation
geometry or changing controls. The [asset contract](asset-contracts.md) and
[functional map](functional-map.md) remain authoritative.

## Minimal implementation boundary

| File / responsibility                           | Required change                                                                                                                                                | Preserve                                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/world/assets/asset-registry.ts`            | Merge generated runtime records with retained placeholder definitions; expose a pure common fallback shape and discriminate image, sheet, and surface metadata | No Phaser or exporter imports; unknown keys remain catalog errors                                     |
| `src/catalog/catalog.ts`                        | Pass the merged catalog through the existing validation boundary                                                                                               | Demo loaders remain lazy; no image loading during catalog import                                      |
| `src/world/attractions/attraction-types.ts`     | Add optional `presentation: { worldAnchor }`                                                                                                                   | `position` continues to mean placeholder top-left                                                     |
| `src/world/attractions/attraction-registry.ts`  | Point only arcade artwork at production keys and add its presentation anchor `(360,1060)`                                                                      | Collision, trigger, entrance, exit, sort anchor and every other plot unchanged                        |
| `src/catalog/validate-catalog.ts`               | Validate runtime metadata and dependencies; calculate production bounds from presentation anchor minus local anchor; validate fallback bounds independently    | Existing bounded reachability allocation and player-position conversion                               |
| `src/world/rendering/attraction-render-plan.ts` | Emit pure image placement/texture data alongside legacy fallback geometry; keep state outline and label data independent of texture success                    | Existing arbitrary-attraction behavior, status gating, labels and sort priority                       |
| `src/world/scenes/boot-scene.ts`                | Preload initial-world images/sheets, classify each as ready or fallback, then start fairground                                                                 | Exactly one normal world-ready event from fairground, not an extra boot event                         |
| `src/world/scenes/fairground-scene.ts`          | Draw production images, repeated surfaces, and player sheet when ready; retain geometry fallbacks; separate image-independent outline from artwork             | Collision bodies, movement, selection, DOM event bridge, teleport, exit, camera and shutdown behavior |
| `src/world/create-game.ts`                      | Supply loading state and explicit visual-test options if needed; retain normal defaults                                                                        | Existing runtime destruction, input cleanup and world failure path                                    |

Do not generalize every landmark to production, add animation dependencies, or
introduce a projection transform in this integration. Repeated surface textures
must use the existing ground and path rectangles as clipping/placement bounds;
do not create a southern path or infer traversability from pixels.

## Exact placement assertions

Arcade production image: 320 × 310, local anchor `(160,310)`, worldAnchor
`(360,1060)`, scale 1. The top-left is `(200,750)` and center is `(360,905)`.
Phaser may place the image at worldAnchor with origin `(0.5,1)`, or at its
calculated center with origin `(0.5,0.5)`; choose one and test it. Explicit
sortAnchor wins, so structure depth stays 1060. Production and selected variants
have identical dimensions/anchors. A failed image uses the declared fallback
at legacy `position`, not at an anchor-derived guessed location; verify the
reviewed manifest fallback is 300 × 190 for the arcade.

The player must retain its existing visual-center position **P**, body center
**G = P + (0,16)**, and sorting contact **F = P.y + 25**. For this 34 × 58 frame
sheet, record image-local ground anchor **(17,45)**. Create a scale-1 sprite at P
with **`setOrigin(0.5,0.5)`**, then body size 20 × 18 and offset `(7,36)`. An
explicit `setSize(20,18,false)` followed by `setOffset(7,36)` avoids incidental
recentering. The local ground anchor then maps exactly to G. Do not use a
bottom-center player origin or put P at G; either would move existing physics.

The sheet must remain untrimmed across frames. Frame origin and body offsets
must not change as an animation advances or a fallback replaces the sprite.
If PR2 exports a different local ground anchor, resolve that contract explicitly
before integration; do not silently alter the offsets to make the art look right.

| State               | P          | G          | F    |
| ------------------- | ---------- | ---------- | ---- |
| Spawn               | (960,1120) | (960,1136) | 1145 |
| Locate / exit start | (360,1085) | (360,1101) | 1110 |
| Exit complete       | (360,1160) | (360,1176) | 1185 |

Exit-complete G must remain outside the trigger ending at y 1170. Test both
normal 450 ms exit and immediate reduced-motion exit. Sprite artwork must not
change the exact reported `y 1160` expected by the existing browser test.

## Sheet playback

The 4 × 4 sheet has row-major frames, directions south, west, east, north, and
columns idle, walk 1, walk 2, walk 3:

| Direction | Idle frame | Walking frames |
| --------- | ---------- | -------------- |
| South     | 0          | 1, 2, 3        |
| West      | 4          | 5, 6, 7        |
| East      | 8          | 9, 10, 11      |
| North     | 12         | 13, 14, 15     |

Keep direction selection a small pure function. Use the actual movement vector
and a documented diagonal tie-break (for example horizontal wins when both axes
have equal magnitude), retain the last facing when stationary, and avoid
restarting a playing animation each update. Direction choice must not modify the
normalized velocity. Begin in south idle. Stop to the retained idle when controls
are deactivated, on pause, or on entering a dialog. During the existing exit
tween use south-facing movement; return to south idle at completion. Reduced
motion uses static direction frames and skips exit tweening as it does today.

## Loading and fallback tests

Use the installed Phaser loader lifecycle: an initial image uses `load.image`,
a frame grid uses `load.spritesheet` with explicit 34 × 58 frame dimensions,
and boot `create` follows preload completion. Register error listeners before
queueing. Use `FILE_LOAD_ERROR` plus a final texture/frame readiness check after
loading; HTTP success alone does not prove successful PNG decode. Local Phaser
source confirms XHR image loading is the default and image decode can fail in
the processing stage. Configure a finite loading timeout so stalled requests do
not leave Explore disabled indefinitely.

- Abort the arcade base request: boot settles, labelled fallback appears,
  Explore remains enabled, keyboard collision/activation/exit and directory work.
- Return invalid PNG bytes with successful HTTP status: same fallback; no Phaser
  missing-texture checkerboard, uncaught error, or permanently pending boot.
- Fail only selected image: keep the ready base image with programmatic outline;
  selected/visited/high-contrast state still works without changing image origin.
- Fail player sheet: show the original-size player fallback with identical body,
  sorting and position behavior; never attempt to play nonexistent frames.
- Fail one ground/path image: preserve the original plain fill over the exact map
  rectangle; unrelated ready textures render normally.
- Delay one initial image: no early world-ready; after success or timeout each
  initial entry is settled before fairground starts. No deferred asset gates boot.
- Emit one application diagnostic per failed key, not every render frame or
  every failed selection. Do not route recoverable image failures through the
  fatal world-error event, which disables world access.
- Destroy/recreate the game: loader listeners and animation registrations do not
  accumulate; no late event mutates the destroyed scene. Empty/fully cached
  initial queues also reach ready exactly once.

Resolve production URLs through the bundler, not by concatenating repository
`src/assets/...` strings at runtime. Test built-preview requests as well as dev:
hashed output URLs and non-root base paths must still resolve. Do not import the
source inventory, source PNGs, concept PNG, or export tools into the app bundle.

## Pure unit and catalog coverage

- Keep existing placeholder render-plan tests, including the temporary attraction
  with a position unrelated to its collider and an explicit sort anchor.
- Add a production record proving worldAnchor placement and explicit sortAnchor
  precedence; absent presentation metadata retains legacy placement, while a
  production asset requiring anchor placement without it fails clearly.
- Assert visible bounds `(200,750,320,310)` independently from unchanged arcade
  collision `(210,870,300,190)` and fallback `(210,870,300,190)`.
- Reject nonfinite/fractional dimensions, out-of-range anchors, bad frame grids,
  duplicate keys, missing/cyclic dependencies, initial-to-deferred dependencies,
  incompatible selected variants and off-map anchor-derived visible bounds.
- Assert runtime catalog imports contain no Phaser/demo execution/export tooling.
  Preserve validation-module load failure behavior and unavailable-demo guards.
- Test sheet-direction/frame selection, stationary retained facing, diagonal
  tie-break, paused/reduced-motion idle, and missing-sheet fallback selection.
- Test P/G/F geometry through all four sheet rows and after teleport/exit. Include
  movement at collider boundaries, not only calculated position helpers.

## Deterministic visual regression mode

Add a narrowly scoped test configuration with a fixed camera, player position,
player frame, selected/visited state, and disabled decorative animation. Keep
it separate from `debug-world`: debug physics outlines and FPS text must not
leak into comparison screenshots. Enable it explicitly in the test build or
test harness; ordinary URL/query input must not silently replace normal state.
Test options do not create new production controls or change normal movement.

Use a pinned browser/OS screenshot baseline, viewport, device scale factor 1,
cleared storage, explicit color/motion preferences, decoded initial textures,
loaded fonts, and a rendered frame after setup. Never establish a screenshot by
holding a key for an arbitrary number of milliseconds or by assuming network
idle means texture decode is complete. Freeze the player animation frame and
camera follow easing for the fixture; do not globally freeze functional tests.
Compare the canvas/scene crop and test semantic UI separately; avoid masking
the player, doorway, selection outline, or other artifacts being validated.

| Fixture                                     | Evidence required                                                  |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Arcade overview, zoom 1, fixed scroll       | Whole 320 × 310 silhouette, entrance and local surface seams       |
| Player behind at P (360,820)                | Body bottom 845; player sorts behind arcade depth 1060             |
| Player west/east at P (185,940) / (535,940) | Clear physics footprint and readable side-edge occlusion           |
| Entrance at P (360,1085), selected          | Player in front; outline, label and prompt remain readable         |
| Exit at P (360,1160), visited               | Player in front, no proximity selection, visited treatment visible |
| High contrast + reduced motion              | Non-color state distinction with static character                  |
| Base/selected/player/surface failures       | Intentional fallback appearance, not a blank or missing texture    |

Run scene fixtures at desktop 1440 × 900 and tablet 1024 × 768; retain the existing
390 × 844 semantic-directory/control checks. Include atlas frame checks for all
16 player frames, even though screenshot fixtures pin a single frame.

Camera behavior is also functional evidence: retain tests for manual pan, wheel,
Alt-wheel zoom, native Ctrl/Meta browser zoom, accessible Return, bounds after
2560 × 1440 resize, and returning to follow on movement while retaining manual
zoom. Inspect the arcade at zoom 1 and zoom 4, minimum-fit framing, and after
Locate/Return. Keep the normal camera following P, not the new art anchor G.

## Completion gate

Run `vp check`, `vp test`, `vp run lint`, the production build, and the complete
Playwright suite against that build, plus the new image-failure and screenshot
fixtures. Re-run the existing keyboard demo loop with and without reduced
motion, repeated dialog cleanup/visited state, focus restoration, demo laziness,
coming-soon guards, camera controls, and world-unavailable directory access.

Record actual initial image request count/transfer/decode proxy and compare with
PR2 manifest budgets. Check console and network errors, sprite/frame changes,
four-sided arcade occlusion, tile seams and fallback behavior manually before
accepting new image baselines. A changed image baseline is not authorization to
weaken a geometry, accessibility, or performance assertion.

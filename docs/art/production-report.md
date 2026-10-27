# Phase 4 production-area evidence

Date: 2026-09-11. This report covers the first arcade-area export and its PR3
integration checks. Other attractions remain intentionally outside this proof area.
Hardware performance claims are excluded; measured checks are recorded below.

## Exported proof area

The accepted visual direction produced one arcade exterior, one four-facing player
sheet, one low planter, and two deterministic surface tiles. Other attractions
remain placeholders. Source files, crop registration, recipes, and generation
provenance are documented in [the source inventory](../../art/source/README.md)
and [provenance record](../../art/source/provenance.md).

The original player sheet had weak opposing-foot variation, particularly in its
front/back rows. The replacement `player-walk-v2.png` has clearly differentiated
steps at the intended 34 × 58 logical frame size. The original is retained as a
non-runtime source revision. A separate attempted correction with a baked
checkerboard was rejected rather than treated as valid transparency.

The final player uses dark hair and simple dot eyes with a mustard hooded jacket;
it does not use the direction document's initially proposed cream cap. Source
dimensions are native generated dimensions, not an assumed exact 2× canvas. Fixed,
measured source crops and explicit contain-fitting preserve proportions without
changing the 34 × 58 frame size or (17, 45) ground anchor.

## Measured image budget

Values below are from the generated runtime manifest for the v2 player export.
Transfer is encoded PNG file bytes, not a second gzip estimate. Decoded size is the
comparable width × height × 4 RGBA proxy, not actual browser/GPU memory usage.

| Texture         | Runtime pixels | Encoded bytes | Decoded RGBA bytes |
| --------------- | -------------- | ------------: | -----------------: |
| Arcade exterior | 320 × 310      |       161,035 |            396,800 |
| Player sheet    | 136 × 232      |        53,406 |            126,208 |
| Planter         | 28 × 28        |         2,001 |              3,136 |
| Sage ground     | 128 × 128      |           796 |             65,536 |
| Clay path       | 128 × 128      |           650 |             65,536 |
| Total           | Five textures  |       217,888 |            657,216 |

The total is approximately 212.78 KiB transferred and 641.81 KiB decoded, below the
600 KiB / 16 MiB / ten-texture proof-area ceilings. All five textures belong to
`initial-world`. No concept image or original source image belongs in those totals
or in the runtime import graph.

The exporter reported 1,015 ms for the final export and 963 ms for the immediate
deterministic recheck on the local development machine. These are individual tool
observations, not statistically sampled benchmarks or browser decode timings.
The generated manifest records both encoded-output and decoded-pixel SHA-256
hashes for subsequent reproducibility checks.

## Independent output QA

The optimized files were inspected at their intended runtime sizes, not only as
large source previews. The arcade opening, two cabinet silhouettes, marquee, and
awning remain readable. The tiny planter keeps a coherent foliage/container
silhouette. Sparse ground/path marks stay subordinate to the player and arcade.
No further source-art correction was recommended after the v2 player export.

A separate bounded-read raw-pixel check verified:

- Both 128 × 128 surface tiles have zero mismatched RGBA samples across opposing
  edges and zero nonopaque pixels.
- The arcade and planter outer borders contain zero nontransparent pixels.
- Every one of the sixteen final player frames has an entirely transparent outer
  border: maximum border alpha zero, not merely below a permissive threshold.
- Player registration remains consistent with 34 × 58 frames and (17, 45) anchor.
  Its explicit content box is (2, 1), 30 × 53, adding a clear top margin without
  moving the physics body.

Checks used file type/size validation before bounded reads and a pixel-allocation
limit before decoding. They did not mutate original sources or generated outputs.

## Validation evidence and remaining review

The export owner reported ten passing exporter tests, a passing exporter typecheck,
and passing targeted lint. The integration owner reported 93 passing unit tests,
a passing application typecheck, and a successful production build before browser
acceptance began.

The targeted browser suite covers five real image fetches plus successful texture
readiness, all four moving/idle player facings, actual body-ground relationships,
debug hooks absent during ordinary browsing, aborted and undecodable arcade image
fallbacks, player and ground fallback, a bounded stalled-image watchdog, real
activation/exit after fallback, and coordinate preservation through camera zoom and
viewport resizing.

All eight functional cases passed against the integration preview. The ninth,
fresh-load visual repeatability case passed in an isolated rerun after excluding
only the live DOM diagnostic overlay from captures. The canvas locator's screenshot
includes overlapping page content, so a changing FPS counter was not evidence of
unstable world rendering. Player, doorway, labels, and interaction state remain
unmasked. Repeatability compares SHA-256 strings of captured PNGs to avoid an
unboundedly large byte-array assertion diff; it still requires exact equality.

These nine cases were run with stored snapshot assertions disabled because reviewed
platform baselines were not yet available. Passing repeatability does not claim
that the stored-baseline comparison has passed.

The fetch-failure test originally assumed a single transport attempt. Phaser retries
failed transport requests, so that assertion was corrected to require an observed
interception and the final settled fallback state. The application behavior, not
the loader's incidental retry count, is the contract under test.

The explicit visual fixture checks fresh-load repeatability separately from its
stored screenshot comparison. Five fixed, debug-gated presets now cover the arcade
overview, player behind, west side, east side, and visited exit. Their coordinates
are whitelisted rather than accepting arbitrary URL-provided game state.

## Final integration review

- The isolated PR2 checkout passed formatting/lint/type checks, 82 unit tests,
  deterministic export checks, and a production build. Both foundation and pipeline
  PRs passed GitHub CI before the integration PR was submitted.
- The integrated tree passed `vp check`, all 101 unit tests, stylesheet/script
  lint, the dedicated exporter typecheck, deterministic export checking, and the
  production build. The existing large Phaser bundle warning remains unchanged in
  nature; source artwork and export tooling are not bundled into the game.
- All 36 pre-existing browser tests passed, including accessibility, focus,
  keyboard entry/exit, repeated dialog cleanup, camera controls, and directory
  fallback when the world is unavailable.
- All 13 Phase 4 browser cases passed on macOS while generating the five visual
  baselines. Root inspected every capture: the player is occluded behind the
  building, visible on either side, and unobscured in front and after exit.
- Direct Chrome computer-use review exercised directory Locate, keyboard Enter,
  Escape/returned focus, camera zoom, and panel dismissal. It caught an interaction
  hint covering the player; the production-only hint now sits on the arcade awning,
  leaving player and entrance readable. Legacy attraction marker placement stays
  unchanged.
- The matching Playwright 1.62.1 Noble Linux container passed all 13 Phase 4 cases
  during capture, followed by all five stored-baseline comparisons without updates.
  An independent reviewer inspected and accepted every Linux capture. The initial
  Docker hostname was rejected by Vite; the temporary test configuration used
  Docker's resolved host IP instead, without changing application host protections.
- The combined 49-test macOS run passed in 2.2 minutes with stored-baseline
  comparisons enabled and no snapshot updates. No browser test was skipped.

No production Core Web Vitals, frame-time distribution, input latency, sustained
animation/GPU performance, or actual texture-residency measurements were performed
as part of this source/export QA. Those cannot be inferred from compressed image
size, the RGBA estimate, or a passing software-rendered browser test.

## Reproducing visual checks

Run `vp run test:e2e`. The [canonical Docker runner](../testing/playwright.md)
installs isolated locked dependencies, builds, serves and tests entirely within
the digest-pinned Playwright 1.62.1 Noble Linux/amd64 image. CI calls the identical
entrypoint; a host build or host preview server is not used. Visual fixtures retain
their 1440 × 900 viewport, device scale 1, and reduced motion.

For an intentional visual change, use `vp run test:e2e:update` and inspect all five
resulting Linux images before committing. Linux/amd64 is now the sole approved
baseline platform, including when invoked from an ARM Mac. Do not refresh
baselines merely to silence a failure. Capture renders only the world canvas;
the HTML shell is visually hidden without changing layout. The player, arcade,
canvas labels, and interaction markers remain visible to the visual regression
check. Separate browser tests cover HTML controls, focus, accessibility and layout.

## Hosted CI rendering correction

This section records the initial integration history. Its temporary mixed-platform
setup has since been superseded by the canonical Docker runner above; the visual
changes are recorded in [the three-quarter revision](./three-quarter-revision.md).

The first integration CI run passed all 44 functional browser cases but failed
the five stored visual comparisons. All retries produced the same differences.
Artifact review traced those differences to platform-specific HTML system fonts:
header sizing, button wrapping and the DOM attraction prompt. A direct comparison
of the arcade region (450 × 470 pixels, including player and canvas labels) found
zero differing pixels between the local Linux baseline and hosted CI.

Canvas locator screenshots include overlapping HTML siblings. The fixtures now
hide the HTML shell with test-only visibility rules and explicitly retain canvas
visibility. This isolates art regression from platform-font UI variation, without
masking artwork or weakening the exact pixel thresholds or fresh-load equality.
Both platform baseline sets are regenerated and reviewed for this corrected scope.
Runtime code and CI security/environment settings are unchanged by this correction.
All five corrected comparisons passed without updates on Linux (19.0 seconds) and
macOS (17.4 seconds), and all ten images passed independent visual review. Formatting,
lint and type checks also passed after the test-only change.

The next hosted run passed 48 of 49 tests. Its only remaining difference was 336
pixels in the visited caption: the Unicode checkmark selected a platform-dependent
fallback font and shifted the following word. The visited-state unit expectation
was changed first and observed failing, then the redundant symbol was removed.
The visible `Visited` text and state outline continue to communicate status without
color dependence. This is a small production adjustment from the direction's
proposed check-shaped badge; a future icon should be drawn rather than font-backed.
All 101 unit tests, static checks and the production build passed afterward; only
the two visited-exit baselines require regeneration for this change.

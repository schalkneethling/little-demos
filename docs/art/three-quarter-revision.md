# Three-quarter production revision

The user identified three gaps in the initial runtime proof: a hard rectangular
selection/visited frame, undersized planters, and a front-facing arcade that lost
the approved concept's elevated three-quarter perspective. This revision treats
the reference's viewpoint and proportions as requirements, not just its palette.

## Visual contract

- Retain teal timber `#31777a`, coral canvas `#bb4d42`, cream trim `#f8f4e9`,
  mustard marquee `#e5b74c`, sage foliage `#6d9a83`, and ink `#173449`.
- Show the arcade's roof and right wall. Keep the stepped marquee, scalloped
  awning, and both cabinets visible; do not cover them with a caption band.
- Keep the existing HTML typography. World captions are secondary, compact,
  readable, and outside the artwork; accessible names/actions remain in HTML.
- Active artwork receives a static alpha-shaped glow, never a bounding-box frame.
  Explicit action and visited text remain; color is not the only state cue.
- Export substantial 48 × 56 planters, with the timber crate approximately
  waist-high relative to the player. Stagger them along the projected front posts
  at `(234, 1023)` and `(437, 1055)`, inside the existing solid footprint.
- Preserve the functional navigation plane, trigger, exit route, and player body.
  This is a three-quarter illustration treatment, not a rotated/isometric map.

These choices prioritize the reference's material and silhouette rather than
adding interface ornament. The remaining placeholder attractions and rectilinear
terrain are not claimed to reproduce the full illustrated environment. A later
environment pass must carry this camera treatment into paths, foliage, and the
remaining structures consistently.

The current player sheet also remains more stylized/big-headed than the reference.
Three attempted adult-proportion replacements were rejected for opaque painted
backgrounds or inconsistent poses/proportions. They were not added to the repo;
the valid animated sheet and unchanged physics contract are retained. A future
replacement should reduce head size and lengthen the legs within the same frames.

The silhouette effect derives two bounded 368 × 358 RGBA canvas textures (warm
and high-contrast white), approximately 1.01 MiB combined decoded-size proxy,
plus one temporary mask. These are generated locally, not downloaded assets;
actual GPU allocation is not claimed by this estimate. The player has a separate
20 × 8 static contact ellipse following its existing foot/sort point.

## Source provenance

Generated with the built-in image-generation tool on 2026-09-11, using the user's
approved concept (also stored at `concepts/arcade-direction-v1.png`) as a reference.
Old sources remain unchanged for comparison. Exporting uses explicit recorded
crops and the existing bounded, deterministic asset pipeline; source images do
not ship to the browser.

### Arcade

Source: `art/source/arcade-three-quarter-v2.png`, 1536 × 1024.
Recorded crop: `(145, 18, 1245, 997)`. Output remains 320 × 310, with its original
bottom-center anchor. Alpha above 8/255 occupies `(152, 24)` through `(1381, 1007)`.

Prompt:

> Use case: stylized-concept. Asset type: single transparent production game sprite.
> Reference image is the approved style and viewpoint reference, not an edit target
> or a request to reproduce the whole sheet. Generate one isolated arcade pavilion
> matching the large left arcade in the reference very closely: elevated
> three-quarter view, front and right wall visible, substantial roof plane,
> upright vertical walls, orthographic/no vanishing-point convergence. Same warm
> handcrafted painted miniature materials, teal timber panels, coral-and-cream
> scalloped awning, stepped mustard marquee with cream trim and gold finials, two
> dark arcade cabinets inside the open entrance, right-wall pennant bunting.
> Match sophisticated proportions and painterly surface, not a front-on symmetric
> icon or toy plastic render. Blank marquee, no text/UI/rectangle outline. Truly
> transparent background, clean alpha, ample padding on all edges. Exclude
> planters, plants, trees, people, lamps, fences, benches and landscape. Include
> only the interior threshold floor, no exterior slab or backdrop shadow. Front
> faces lower-left, right side recedes upper-right exactly as the reference. Full
> building uncropped, one large asset filling about 85% of the canvas.

### Planter

Source: `art/source/planter-three-quarter-v2.png`, 1254 × 1254.
Recorded crop: `(243, 111, 780, 1035)`. Output 48 × 56 with anchor `(24, 56)`.
Alpha above 8/255 occupies `(251, 119)` through `(1014, 1137)`.

Prompt:

> Use case: stylized-concept. One transparent production game prop, using the
> approved reference's style and camera. A single pale cream timber square planter
> with sage foliage and a few tiny cream flowers, matching the lower-right
> standalone planter. Elevated three-quarter orthographic camera, front and right
> box faces visible, vertical edges upright, same perspective as the arcade.
> Warm handcrafted painterly miniature, subtle board seams, clustered leaves and
> broad forms. Box occupies lower 45% of total height, foliage 55%; substantial
> waist-high crate relative to a human. No cartoon outline or front-on symmetrical
> view. True transparent background, clean alpha and ample padding; no ground,
> cast shadow, grass patch, scene, text or labels. One complete isolated centered
> planter, legible at 48 × 56 pixels, square source image.

## Revision verification

- State/layout, silhouette-compositing, planter-clearance and Docker-wrapper
  regressions were added with failing checks before the corresponding fixes.
  All 109 unit tests and static checks pass.
- Deterministic export validation passes: five PNGs, 203,136 encoded bytes and
  664,832 decoded RGBA-proxy bytes, excluding the derived glow textures above.
- The five revised Linux/amd64 visual captures passed in the pinned container
  (1.1 minutes), including exact fresh-load repeatability. Independent review
  accepted every capture. Behind the lower-profile roof, the player's head and
  upper torso remain visible while the legs are correctly occluded; full
  concealment is not the expected result. Side and exit views remain clear.
- Real Chrome computer-use checks passed for keyboard entry, Escape/returned
  focus, selected glow versus visited/no-glow, camera zoom and mouse drag. The
  façade and planters were reviewed at normal and enlarged zoom.
- The complete 49-test Docker browser suite passed in 6.2 minutes on the ARM Mac
  through Linux/amd64 emulation, without retries or snapshot updates. This includes
  the production build, asset-failure recovery, reduced motion, keyboard/focus,
  viewport/camera controls, and all five strict visual comparisons. CI invokes the
  same container runner; these timings are local, not a hosted CI measurement.

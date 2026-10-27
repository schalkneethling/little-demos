# Fairground experience refinement

## 1. Outcome and delivery strategy

Transform the current object-filled map into a coherent miniature fairground: inviting paths, grounded scenery, distinctive areas and carefully controlled motion.

The viewport remains a window into the world—not a constraint on its layout. Preserve the approved art direction, six working demos, accessible directory, keyboard navigation and manual camera controls.

Deliver **seven reviewable PRs across five workstreams**. Animation is split into three PRs so each attraction can pass or fail independently without blocking the spatial improvements.

Current starting point: Phase 5 PR #13 remains open and draft. Build above its current head; do not merge existing PRs automatically. Recheck remote state before implementation. If Phase 5 has merged, start from updated main instead.

### Responsibilities

| Work | Primary assignment | Independent review |
|---|---|---|
| Spatial contracts, motion architecture | GPT 6 Sol/high | Root integration review |
| Substantial implementation | GPT 5.6 Sol/high | GPT 6 Sol/high |
| Bounded regression tests, UI cleanup | GPT 6 Luna/medium | Implementer plus root |
| Documentation and evidence reconciliation | GPT 5.6 Terra/medium | Root |
| Mechanical fixture updates | GPT 5.6 Luna/medium | Test owner |

Use only agents with useful, bounded work. Maximum three concurrent subagents. Root owns Git operations, shared-file integration, visual direction and acceptance. An implementation agent does not provide its own final independent review.

## 2. Spatial approval gate

Complete this before expanding finished scenery across the map. PR 1 may proceed concurrently.

### Deliverables

- A circulation plan showing every attraction, approach, exit and connecting route.
- A playable blockout using existing artwork.
- One finished fountain-garden corner demonstrating paths, ground transitions, prop placement and player occlusion.
- Screenshots at normal play scale covering arrival, a junction and the ride area.
- A short walkthrough demonstrating discovery beyond the initial viewport.

### Composition

Start with a **3200 × 2400 world**, independent of viewport size:

- Arrival court toward the south.
- Fountain garden near the centre.
- Ride grove toward the northwest.
- Demo pavilions grouped along the eastern and southern loop.
- Construction plot on a quieter northeastern spur.

Retain existing demo-to-attraction associations. Arrange entrances toward paths and keep clear views of the next route or landmark. Do not distribute attractions at equal intervals merely to fill space.

Keep current walking speed initially. Target first discovery within 5–10 seconds and ordinary movement between adjacent stops within 5–12 seconds. Shorten routes rather than introduce sprinting or automatically increase movement speed.

### Approval criteria

- The opening view suggests more fairground beyond the screen.
- Paths and entrances read without additional labels.
- Scenery has believable ground contact.
- Negative space feels intentional, not unfinished.
- Exploration feels inviting rather than slow.

The user approves this corner before the treatment is repeated elsewhere. If rejected, revise the blockout/corner only; do not generate an entire replacement asset collection.

## 3. Implementation workstreams and PRs

### PR 1 — Visual restraint and dependable motion preferences

**Owners:** GPT 6 Luna/medium for cleanup; GPT 5.6 Sol/high for preference/lifecycle behavior; GPT 6 Sol/high review.

Remove:

- Bottom “Little Demos” sign.
- “Step right up” kicker.
- Four decorative fountain dots.
- Their unused rendering state, animation updates and obsolete tests.

Retain the existing title, concise subtitle and necessary instructions. Do not replace removed text with new decorative copy.

Implement **system-or-reduce** motion policy:

- Effective reduction is OS reduction **or** an explicit local reduction preference.
- Existing saved `true` remains an explicit reduction preference.
- Existing saved `false` becomes follow-system.
- Without a local override, live OS changes apply immediately.
- Unchecking while the OS permits motion restores system behavior.
- When the OS requires reduction, show the checkbox checked and disabled with a short explanation.
- Show “Use system setting” only when a local override exists; it clears that override without changing the OS.
- Storage failure preserves working session behavior.

Apply changes throughout the running experience:

- Reduce motion to the essential: preserve user-controlled player movement, collision handling and necessary camera following. Stop ambient/decorative animation and nonessential character effects (idle bobbing, bounce and walk-cycle embellishment); a static character pose may still move through the world normally.
- Settle an active attraction-exit tween at its valid destination and emit completion exactly once.
- Remove camera interpolation without moving a manually positioned camera unnecessarily.
- Update mounted demos without remounting or losing input.

**Interface change:** preserve the existing initial `DemoContext.reducedMotion` contract and add a lifecycle-bound motion-change subscription. Demo sessions hold the latest value, including during asynchronous mounting, and remove subscribers on close. Update motion-sensitive demos to respond live.

**Acceptance:** no persisted choice can silently weaken OS reduction; enabling reduction during any running transition leaves controls and focus usable. Test that the player can still traverse the world, reach and activate attractions, and exit safely with reduced motion enabled; do not implement reduction by pausing gameplay or disabling movement input.

---

### PR 2 — Spacious authored world and camera behavior

**Owners:** GPT 6 Sol/high for contracts; GPT 5.6 Sol/high for implementation; GPT 6 Luna/medium for tests.

Implement the approved blockout as production world data.

Separate these concepts:

- Artwork placement and ground-contact anchor.
- Collision footprint.
- Approach/interaction zone.
- Entrance and exit position.
- Render-depth anchor.

Use attraction-local coordinates for attached scenery and explicitly authored world coordinates for independent landscape props. Moving an attraction must not require hunting through unrelated planter coordinate tables.

Camera rules:

- Default view uses normal play scale, not fit-to-world.
- Resize changes visible area, never world layout.
- Retain existing pan, zoom, Return to player and Locate behavior.
- Preserve browser pinch/zoom gestures.
- Keep camera and player inside valid world bounds.
- Small screens retain directory-first access; do not squeeze the world into an overview.
- Manual zoom-out may reveal an overview, but overview is never imposed on startup.

Preserve current collision-based movement. Paths communicate circulation; grass does not become implicitly unwalkable.

**Acceptance:** all six demos and the unfinished plot have unobstructed approaches; real keyboard routes reveal initially offscreen attractions; exits cannot strand or immediately reactivate the player.

---

### PR 3 — Ground surfaces and intentional planting

**Owners:** GPT 5.6 Sol/high for rendering; GPT 6 Sol/high for depth/performance review; Luna for bounded tests; Terra for documentation.

Replace rectangular path bands with **authored polygonal surfaces**:

- A continuous main loop.
- Narrower attraction spurs.
- Small entrance aprons.
- A shaped fountain court.
- Gentle bends and softened junctions rather than random waviness.

Use world-aligned repeating ground textures clipped to those surfaces. Use the installed Phaser version’s supported renderer-specific masking path; do not copy obsolete Phaser 3 WebGL masking examples. Keep a flat-colour polygon fallback if surface textures fail.

Use restrained, deterministic edge dressing to soften grass transitions. Do not generate a giant world-sized bitmap or redraw static terrain each frame. Dispose of masks and generated resources on scene shutdown.

Replace the planter-pair rule:

- No minimum or equal planter count per attraction.
- Place props to frame an entrance, define a garden edge or support a seating area.
- Remove standalone duplicates where artwork already contains planting.
- Use genuine ground anchors and appropriate contact shadows.
- Never position a freestanding planter on a roof, ride platform or inside an entrance merely to satisfy a collision-box test.

Independent props sort using their own grounded position. If flat building artwork cannot produce believable overlap, move the prop to a valid location; do not force it above the whole building.

Replace tests asserting “two planters inside every collider” with tests for support, clearance, bounds and intended depth relationships.

Update obsolete art documentation describing the project as a five-image proof.

**Acceptance:** no floating or embedded planters, blocked approaches, abrupt rectangular grass cutouts, conspicuous texture seams or decorative elements that imply nonexistent interaction.

---

### PR 4 — Discoverable unfinished attractions

**Owners:** GPT 5.6 Sol/high for behavior; GPT 6 Luna/medium for test coverage; root for art direction; GPT 6 Sol/high review.

Separate **proximity selection** from **demo activation**:

- Available and coming-soon attractions may produce proximity information.
- Only available attractions can open demos.
- Decorative objects remain excluded.

Reuse the existing semantic status surface:

> New attraction coming soon.

No Open button, keyboard activation instruction, demo import, visited state or exit animation for an unfinished attraction.

Clear previous content before every status transition. Leaving the zone clears the message. Announce on entry/change, not every frame. Preserve normal focus and do not introduce another modal.

Remove the floating badge when the replacement message is working.

Create **one reusable construction variant** matching the approved style: partially assembled canopy or grounded timber/barrier dressing. Keep critical wording in HTML, not baked into the image. Its appearance must not imply a passable doorway where collision prevents entry.

If the construction image fails to load, retain the existing static fallback and proximity explanation.

**Acceptance:** unfinished plots are understandable visually and accessibly, with no misleading affordances; the prompt remains usable through resizing and browser zoom.

---

### PR 5 — Motion foundation and fountain proof

**Owners:** GPT 6 Sol/high for state/lifecycle design; GPT 5.6 Sol/high for implementation; GPT 6 Luna/medium for regression tests.

Use **coherent frame sequences**, exported as sprite sheets through the existing bounded asset pipeline. Do not animate runtime component layers or warp the entire still image.

Add a dedicated attraction-motion controller rather than expanding scene orchestration further.

**Motion metadata:** optional animation asset reference, ordered frames, playback cadence and loop behavior. The static artwork remains the authoritative fallback. Collision, entrances and depth anchors do not change between frames.

**Runtime behavior:**

- Defer animation assets until the player approaches.
- Start eligibility within 600 world units; stop eligibility beyond 800 to prevent boundary chatter.
- Advance frames only while the attraction is visible, the world is active and reduction is off.
- Pause when a demo opens or the page becomes hidden.
- On reduced motion, immediately show the static artwork.
- Resume without jumping through elapsed hidden time.
- Deduplicate loads by asset key and bound concurrent deferred loads.
- Reuse existing loading/decode watchdog protections.
- Failed loads stay static for that session; no repeated retry storm.
- Destroy scene-owned listeners, timers and animation objects on shutdown.
- Visual-test fixtures use a fixed frame.

Fountain proof requirements:

- Stonework remains completely stable.
- Water motion stays within the intended water surfaces.
- No flicker, geometry drift, changing highlights or visible loop seam.
- Static and animated versions align without a visible jump.
- Review at actual play scale and enlarged frame-by-frame.

**Approval gate:** present the fountain loop for user review. If rejected, retain the still image and revise only the proof. Do not proceed to ride animation until the sequence workflow is accepted.

---

### PR 6 — Ferris wheel sequence

Reuse the accepted motion system; no parallel animation architecture.

Require:

- Stationary supports and grounded base.
- Correct wheel perspective.
- Upright cabins following a coherent orbit.
- Consistent cabin count and occlusion.
- Seamless looping with no whole-image rotation.

Ship only after individual visual approval. Otherwise leave the wheel static without blocking other PRs.

### PR 7 — Carousel sequence

Reuse the same controller and export contract.

Require:

- Stable roof, platform and ground contact.
- Horses moving along a coherent circular path.
- Correct front/back ordering and consistent horse count.
- Restrained vertical travel.
- No whole-building bobbing, stretching or texture shimmer.

Ship only after individual visual approval. Otherwise retain static artwork.

For both rides: GPT 5.6 Sol/high integrates accepted sequences; GPT 6 Sol/high reviews lifecycle and rendering; root conducts visual acceptance.

## 4. Testing, budgets and integration

### Test-first workflow

For each behavior change:

1. Add a failing regression test.
2. Implement the smallest complete change.
3. Run focused tests.
4. Obtain independent review.
5. Run the full validation required for that PR.

Visual work begins with explicit reference views and acceptance criteria. Screenshot equality proves stability—not artistic quality.

### Required coverage

- OS preference × absent, explicit-reduce and legacy-false storage.
- Live preference changes during exploration, exits and mounted demos.
- Denied/corrupt storage and repeat mount/unmount.
- Player-footprint reachability, safe exits and non-overlapping activation zones.
- Actual keyboard walks from spawn—not only Locate-based tests.
- Available ↔ coming-soon transitions without stale status or accidental activation.
- Resize during camera following and manual pan.
- Animation visibility, proximity hysteresis, pause/resume, reduced motion and shutdown.
- Missing, invalid and stalled animation assets.
- Stable anchors, frame dimensions, loop continuity and consistent static fallback.
- Front, rear and side occlusion around every dressed attraction.

### Browser validation

Run the complete pinned Linux Docker Playwright suite on the final integrated tree. No skipped failures, relaxed screenshot thresholds or automatic acceptance of new baselines.

Manually review Chrome with keyboard, mouse and trackpad. Cover 320, 768, 1280, 1920 and ultrawide layouts, orientation changes and 200% browser zoom. Check screen-reader status announcements and focus return.

Run existing formatting, lint, application/test type checks, unit tests, asset checks and production build. Record actual commands and outcomes.

### Resource limits

Preserve current budgets:

- Initial world: **1.25 MiB transfer, 24 MiB decoded proxy, 16 files**.
- Whole-world assets: **4 MiB transfer, 48 MiB decoded proxy, 40 files**.
- Existing per-file dimension and allocation guards remain enforced.

Account separately for masks, glow textures and other generated GPU resources. Profile the largest accepted scene and all enabled sequences. If a sequence exceeds budget, reduce its cost or retain static art; do not silently raise limits.

Use the current development machine as the recorded desktop baseline, plus throttled browser testing. Target stable 60 fps during ordinary traversal; report hardware and measured frame times.

### Coordination

- PR 1 and the spatial approval gate run concurrently.
- PR 2 establishes world contracts; PR 3 builds on them.
- PR 4 behavior can develop in parallel after contracts are fixed.
- Fountain asset exploration can run alongside spatial work; production integration waits for stable anchors.
- PRs 6 and 7 follow fountain approval and remain independently rejectable.
- Only one agent edits shared scene orchestration at a time.
- Keep PRs draft until their acceptance gates and checks pass. No automatic merges.

## 5. Defaults and completion criteria

Keep current palette, miniature perspective, typography and demo associations. No engine rewrite, procedural infinite world, audio, NPCs, collectibles, accounts, new input scheme or forced position restoration in this milestone.

Frame count and cadence are outputs of the approved visual proof, constrained by existing budgets—not numbers to choose before seeing the animation. User approval of the dressed corner and each animation is an explicit deliverable, not an implementation decision delegated to an agent.

The milestone is complete when:

- The fairground feels like connected places extending beyond the viewport.
- Paths, props and entrances are visually grounded and intentional.
- Redundant text and misleading dots/badges are gone.
- Motion always respects the OS and local reduction preference.
- Unfinished attractions explain themselves without pretending to be usable.
- Every shipped animation passes visual approval; rejected sequences remain static.
- All demos, accessibility paths, fallbacks and automated checks remain working.

Remembered position, seasonal scenery and “new since last visit” discovery remain later proposals. The immediate goal is craftsmanship and a pleasant place to explore—not additional systems.

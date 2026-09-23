# Fairground refinement checkpoint

## Scope

The first implementation slice removes the introductory kicker, duplicate entrance sign,
and decorative fountain dots. Reduced motion is system-or-explicit-reduce, updates mounted
demos live, and preserves essential player movement and camera following.

The separate spatial approval preview is not a production map replacement. Production
world contracts, landscaping, unfinished-attraction behavior, and animation remain gated
by the implementation plan and subsequent visual approvals.

## Test-first and review evidence

- Decoration/exit tests initially failed; implementation made them pass.
- Initial browser motion regression run: 3 passed, 4 failed against unfinished behavior.
- Independent GPT 6 Sol review identified active smooth-scroll cancellation; fixed with
  a subscription-driven instant settlement and regression test, then independently reviewed.
- Chrome review found focus loss after hiding the reset button; reset now focuses the
  enabled checkbox or the control-deck summary when the OS requires reduction.
- The OS explanation is linked only while relevant, avoiding a misleading accessible
  description when the system permits motion.
- All six Linux screenshot diffs were inspected: only the requested entrance sign and
  four fountain dots changed. Thresholds remain unchanged.

## Validation

- `vp check`: no formatting, lint, or type errors/warnings.
- `vp test --run`: 129 tests across 35 files passed, including spatial geometry tests.
- `vp run lint`: JavaScript/TypeScript and CSS checks passed.
- `vp run typecheck`: passed.
- `vp run assets:check`: nine assets, 652,906 transfer bytes, 2,092,832 decoded bytes.
- Production build passed; existing Phaser chunk-size advisory remains.
- Focused pinned Linux motion run: seven tests passed. Two further exit/camera tests
  passed locally; the complete Linux suite is the final validation below.
- Six intentionally changed Linux visual baselines regenerated after diff review.
- Initial complete Linux run: 67 passed, one new exit test missed the short tween
  through a throttled text diagnostic. The test now pauses Playwright's clock,
  advances 150 ms, verifies a genuine intermediate position using frame diagnostics,
  enables reduction, then checks settlement and continued movement. Focused Linux
  rerun passed. Final complete rerun: **68 passed in 9.6 minutes**, retries disabled,
  using `DOCKER_BIN=/Applications/Docker.app/Contents/Resources/bin/docker vp run test:e2e --retries=0`.
- Chrome computer-use checks: desktop controls, 320px motion override/reset, preserved
  reset focus, prototype drag/pan and garden composition. No manual screen-reader result
  or exhaustive device/performance claim is made at this checkpoint.

One Docker dependency bootstrap failed in `vp config` with “not in a git directory”;
an unchanged retry succeeded before running tests. No dependency or security settings
were weakened.

## Deferred by design

Production rectangular terrain and arbitrary planter pairing remain in
`src/world/scenes/fairground-scene.ts:122` and
`src/world/rendering/fairground-decoration.ts:20`; PRs 2–3 replace them after spatial approval.
The existing coming-soon badge at `src/world/scenes/fairground-scene.ts:259` remains until
PR 4 supplies its semantic replacement.
Animation PRs remain blocked on their individual visual proof gates.

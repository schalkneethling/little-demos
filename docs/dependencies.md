# Dependency review

## Phaser 4.2.1

**Purpose:** Phaser owns only the fairground canvas layer: placeholder
rendering, Arcade Physics collision, camera bounds/follow, and scene lifecycle.
Application state, document structure, keyboard activation, status text, and
future dialogs remain ordinary TypeScript and DOM APIs.

**Why add it:** The implementation plan explicitly selects a 2.5D Phaser world.
Using Phaser now validates the highest-risk Phase 1 behaviours—movement,
collision, camera constraints, resize, and clean destruction—without building
and maintaining a custom render/physics loop.

**Alternatives considered:** Raw Canvas would reduce dependency size but would
require custom collision, camera, timing, resize, and lifecycle systems. A full
3D engine would add asset, camera, lighting, and performance costs without
benefiting this grey-box navigation loop.

**Client impact:** Phaser is loaded through a dynamic import, after the semantic
shell is initialized. Demo modules do not depend on Phaser and can remain
separate chunks. The production build should continue to track the world chunk
and decoded asset costs as the map gains artwork.

**Maintenance and security:** Phaser is a runtime dependency with no access to
demo HTML or user data. Keep it isolated under `src/world`, review release notes
before upgrades, rerun keyboard/collision/browser checks, and remove it if the
world is ever retired. No Phaser plugin ecosystem packages are included.

## Playwright 1.62.1

**Purpose:** Playwright runs keyboard, focus, scroll-containment, responsive, and
browser-level smoke tests against the production application.

**Why add it:** Unit tests cannot prove browser focus, native event defaults,
Canvas mounting, or document scrolling. The implementation plan requires real
browser end-to-end coverage.

**Alternatives considered:** Webdriver-based tools provide similar coverage but
would introduce a second browser-control ecosystem. Manual-only testing would
be slower and could not protect these behaviours in CI.

**Client impact:** Playwright is development-only. It and its browser binaries
are not included in the client bundle.

**Maintenance and security:** Keep the CI browser version aligned with the
Playwright package, review release notes before upgrades, and avoid testing
against external production accounts or sensitive data.

## axe-core Playwright integration 4.12.1

**Purpose:** `@axe-core/playwright` checks the rendered application shell for
automatically detectable accessibility violations.

**Why add it:** The implementation plan treats accessibility failures as
implementation defects and requires automated checks in browser states.

**Alternatives considered:** Directly injecting `axe-core` would require custom
test plumbing while providing the same engine. Browser audits alone are useful
for manual review but are less deterministic in CI.

**Client impact:** This is development-only and is absent from production
bundles.

**Maintenance and security:** Automated results are a baseline, not a substitute
for keyboard, zoom, screen-reader, and motion review. Update the integration
alongside Playwright and review new or changed rules rather than suppressing
violations broadly.

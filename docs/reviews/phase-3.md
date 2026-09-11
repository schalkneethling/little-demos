# Phase 3 — Data-driven attraction system

## Scope

This phase replaces the separate map-structure inventory with attraction and
asset definitions. The arcade remains the only available world attraction;
Zipper remains directory-only. Existing scenery is represented as decorative
definitions, and the Funhouse demonstrates the coming-soon state. No production
artwork or extra playable demos are introduced.

## Delegation

- Astra, high effort: schemas, catalogs, geometry and reference validation.
- Sol, high effort: definition-driven rendering and interaction-state guards.
- Terra, high effort: directory derivation, availability, and lifecycle integration.
- Coordinating agent: startup diagnostics, temporary-demo test helpers, integration
  review, browser regression tests, and documentation.

## Acceptance checks

- New attraction definitions use the existing renderer and interaction logic.
- Directory availability and world availability share the same definitions.
- Nonavailable entries cannot invoke demo loaders or world activation.
- Invalid catalogs prevent world startup in all builds; development displays the
  individual diagnostics. Validation loads separately from the application shell.
- Decorative structures retain collision but are not advertised as demos.
- The existing modal lifecycle, keyboard controls, and camera navigation remain
  covered by regression tests.

Production artwork remains Phase 4. Reachability validation is a development
authoring check, not a replacement for real keyboard traversal and collision tests.

## Review corrections and verification

Final verification passed: 67 unit tests, 25 Playwright Chromium tests, `vp check`,
`vp run lint`, formatting checks, `git diff --check`, and the production build.

Review corrected sprite-centre versus player-foot geometry in validation, made
optional exit animations complete immediately, guarded both directions of demo
references, made visited lookup safe for unusual IDs, and prevented world failure
from ending a close operation before asynchronous cleanup finishes. Expanded
directory accessibility testing also added a missing level-two heading.

Tests include an isolated temporary attraction that uses the standard rendering
plan, proximity selector, and directory without edits to those systems; temporary
demo mounting/unmounting; bounded reachability and invalid catalog cases; and
production-browser coverage for coming-soon entries, nonavailable deep links,
and failure of the separately loaded validation module. The existing keyboard,
camera, dialog, retry, gzip, viewport, and accessibility suites remain in place.

Chrome computer-use inspection verified successful validated startup, matching
Funhouse coming-soon labels in the world and directory, and the absence of Open
or Locate actions for that entry. No production artwork or deployment was performed.

The production build keeps the shell at approximately 7.73 kB gzip, validation at
1.99 kB gzip, and Phaser/world at 361.90 kB gzip. The existing large-Phaser-chunk
warning remains visible.

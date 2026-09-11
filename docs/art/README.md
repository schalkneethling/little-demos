# Phase 4 — art direction and asset pipeline

Status: first stack layer; visual direction approved by the user on 2026-09-11. Runtime remains the tested grey-box fairground until the integration layer.

## Review sequence

1. [Functional map and coordinate audit](./functional-map.md).
2. [Art direction and inventory](./phase-4-art-direction.md).
3. [Asset contracts and provisional budgets](./asset-contracts.md).
4. [Generated arcade concept and limitations](./concepts/arcade-direction-v1.md).

The concept approves a visual language, not exact image geometry. The functional map remains authoritative. Preserve the full-viewport world, semantic directory, panel controls, native demo dialogs, and accessible keyboard interactions.

## Three-layer stack

| Branch                          | PR responsibility                                                                                         | Dependency     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| `codex/phase-4-art-contracts`   | Map audit, concept, proposed visual conventions and asset contracts                                       | `main`         |
| `codex/phase-4-asset-pipeline`  | Tested exports/optimization, asset validation, approved modular artwork and player sheet                  | Art contracts  |
| `codex/phase-4-production-area` | Phaser integration, player animation, depth/occlusion, production arcade slice and visual regression mode | Asset pipeline |

Only create higher layers when their work begins; do not open empty PRs. Submit drafts using gh-stack and link native GitHub stacks once dependent PRs exist. If native stacks are unavailable, report the requirement rather than silently substitute unrelated PRs. Each layer includes its own relevant tests and documentation. No merges without user approval.

## Ownership and gates

- Astra/high art subagent: direction and inventory, then approved asset consistency.
- Sol/high pipeline subagent: metadata contracts, exports, optimization and validation.
- Astra/high map/integration subagent: topology, coordinate/anchor audit, later Phaser integration.
- Coordinating agent: contracts review, concept generation, stack management, tests, browser acceptance and independent review scheduling.

First gate: user reviews the concept before production artwork. Pipeline research can proceed before approval, but no final art or runtime replacement should assume approval. Prepare lower-layer contracts before consumers; agents must not concurrently switch branches in the shared working directory.

Second gate: one complete arcade area proves the pipeline before Phase 5 expands the fairground. Verify idle/walk frames, live signage, selected/visited states, player occlusion, reachable entrance and exit, fallback loading and missing-asset behavior.

## Validation by layer

- PR 1: compare documented coordinates with registries and player geometry; validate diagram and links; run existing checks and unit tests. No runtime visual snapshot is expected to change.
- PR 2: failing tests first for metadata, anchor/frame bounds, oversized files rejected before reads, export reproducibility, and budget accounting. Preserve sources separately from optimized runtime assets.
- PR 3: failing tests first for render-plan anchors, depth and fallback behavior; deterministic Playwright visuals (fixed viewport, animation time and state) plus interaction/accessibility regressions. Manually inspect in Chrome at normal and enlarged zoom and with reduced motion. Measure transfer sizes, decoded texture memory and frame consistency on actual target hardware; CI alone is not a GPU performance benchmark.

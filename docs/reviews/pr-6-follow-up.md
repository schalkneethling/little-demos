# PR 6 review follow-up

## Addressed

- Disable persisted checkout credentials in CI.
- Respect the current reduced-motion preference in both standalone slider directions.
- Document nullable attraction IDs for directory-only demos.
- Keep mobile world status visually hidden rather than removing it from the accessibility tree.
- Scope pending runtime mounts to their generation; stale completion cannot clear a newer mount.
- Preserve camera zoom when movement resumes follow mode, while retaining the explicit Return to player reset.
- Reduce upper-bound zoom clicks from twelve to seven, retain the explicit timeout, and verify post-resize actionability with a trial click.
- Assert player movement before waiting for the attraction prompt.
- Lock standalone Zipper mode, file selection (including drops), reset, and processing controls during an operation.
- Add standalone Zipper status semantics and visible file-input focus.
- Bound standalone gzip source sizes before reading and transformed output while streaming, including decompression expansion.
- Bound serialized visited-state writes to the same limit as reads.
- Reuse the attraction-interactivity predicate in render plans.
- Use an unset key-event sentinel so an unhandled-key assertion cannot pass before the event.
- Use tolerant camera layout coordinate comparisons.
- Centralize chunk patterns and explicitly verify intercepted requests, including successful demo imports after coming-soon checks.

## Already resolved in the reviewed branch

- Bootstrap already has one world-error emission in the mount rejection handler, with normalization and development logging preserved; no duplicate createGame catch remains.
- Shared toggle heights already reserve two line boxes plus padding, with wide-font and responsive regression coverage. Keep the equality assertion rather than weaken it.

## Validation

Added runtime lifecycle, visited-write, standalone gzip, reduced-motion navigation, standalone processing/focus/status, and mobile accessibility regressions. Extended camera follow and import-interception coverage. Run the unit suite, full Playwright suite, formatting/type checks, CSS lint, and production build before publishing this update.

The optional external CodeRabbit CLI invocation was not needed to apply or validate these findings.

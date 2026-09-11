# Reproducible Playwright tests

Playwright browser tests have one supported environment: the official Playwright
1.62.1 Noble image for Linux amd64, pinned by its platform-specific digest. Both
local runs and CI use the same repository entrypoint, so snapshots do not depend
on the host operating system, browser installation, or CPU architecture.

## Requirements

Install Docker Engine or Docker Desktop and keep enough free space for the image.
The first run downloads roughly 800 MB of compressed image layers. On an Arm Mac,
Docker uses amd64 emulation intentionally; later runs reuse Docker's image and
build cache.

The repository is bind-mounted read/write at `/workspace`, while
`/workspace/node_modules` is a separate temporary in-memory Docker mount. The container
therefore cannot use or replace host dependencies. It installs the locked Bun
dependencies, builds the production application, starts the preview server, and
runs the project-local Playwright binary entirely inside the pinned image.

Run the full suite with:

```sh
vp run test:e2e
```

Pass Playwright arguments after the wrapper when narrowing a local run:

```sh
bash scripts/testing/playwright-docker.sh tests/e2e/app-shell.spec.ts --grep "loads"
```

## Visual baseline policy

Linux amd64 is the sole approved snapshot platform. Intentional visual changes
must be reviewed in the pinned container before updating snapshots with:

```sh
vp run test:e2e:update
```

Commit only the reviewed Linux snapshots. The obsolete Darwin baselines were
removed after the replacement Linux capture passed in the pinned container and
received independent visual review; do not add host-specific baselines.

CI never updates baselines. It runs the same `test:e2e` command with read-only
repository credentials and uploads `test-results/` only when a test fails.

## Security and operational constraints

The test container receives no Docker socket, package-registry credentials, or
GitHub token. Docker drops all Linux capabilities and enables
`no-new-privileges`; the repository bind mount is the only host path exposed.
The application preview cannot reuse a host process because
`reuseExistingServer` is always disabled.

The container process uses the invoking user's numeric UID and GID, including on
native Linux, so generated `dist/`, snapshot, and `test-results/` files remain
host-owned. Chromium's application sandbox is disabled by Playwright's default
test-launch behavior; the surrounding container boundary is constrained by the
dropped capabilities and `no-new-privileges` setting.

#!/usr/bin/env bash

set -euo pipefail

if [[ "$(uname -m)" != "x86_64" ]]; then
  echo "Playwright container must run as linux/amd64." >&2
  exit 1
fi

if ! grep --quiet '^VERSION_CODENAME=noble$' /etc/os-release; then
  echo "Playwright container must run Ubuntu Noble." >&2
  exit 1
fi

if [[ "$(bun --version)" != "1.3.14" ]]; then
  echo "Playwright container requires Bun 1.3.14." >&2
  exit 1
fi

if ! mountpoint --quiet /workspace/node_modules || [[ ! -w /workspace/node_modules ]]; then
  echo "Refusing to use host node_modules; /workspace/node_modules must be a writable container mount." >&2
  exit 1
fi

mkdir -p "${HOME}"

# Bun bootstraps the project-local, lockfile-pinned Vite+ and Playwright binaries.
bun install --frozen-lockfile
node -e 'if (require("@playwright/test/package.json").version !== "1.62.1") process.exit(1)'
bun run build

exec ./node_modules/.bin/playwright test "$@"

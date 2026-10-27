#!/usr/bin/env bash

set -euo pipefail

DOCKER_BIN="${DOCKER_BIN:-docker}"
SCRIPT_DIRECTORY="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPOSITORY_ROOT="$(cd -- "${SCRIPT_DIRECTORY}/../.." && pwd)"
DOCKERFILE="${REPOSITORY_ROOT}/tests/e2e/docker/Dockerfile"
BUILD_CONTEXT="${REPOSITORY_ROOT}/tests/e2e/docker"
IMAGE_TAG="little-demos-playwright:1.62.1-noble-amd64"
HOST_USER_ID="${PLAYWRIGHT_HOST_UID:-$(id -u)}"
HOST_GROUP_ID="${PLAYWRIGHT_HOST_GID:-$(id -g)}"

if [[ ! "${HOST_USER_ID}" =~ ^[0-9]+$ || ! "${HOST_GROUP_ID}" =~ ^[0-9]+$ ]]; then
  echo "Playwright host UID and GID must be numeric." >&2
  exit 1
fi

"${DOCKER_BIN}" build \
  --platform linux/amd64 \
  --file "${DOCKERFILE}" \
  --tag "${IMAGE_TAG}" \
  "${BUILD_CONTEXT}"

"${DOCKER_BIN}" run \
  --rm \
  --init \
  --platform linux/amd64 \
  --shm-size 1g \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --user "${HOST_USER_ID}:${HOST_GROUP_ID}" \
  --mount "type=bind,source=${REPOSITORY_ROOT},target=/workspace" \
  --tmpfs "/workspace/node_modules:rw,exec,nosuid,nodev,mode=0755,uid=${HOST_USER_ID},gid=${HOST_GROUP_ID}" \
  --workdir /workspace \
  --env HOME=/tmp/playwright-home \
  --env CI=1 \
  --env "GITHUB_ACTIONS=${GITHUB_ACTIONS:-}" \
  "${IMAGE_TAG}" \
  bash /workspace/scripts/testing/playwright-container.sh "$@"

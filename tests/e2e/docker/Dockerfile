FROM mcr.microsoft.com/playwright:v1.62.1-noble@sha256:c091b21d9fae78c76e85cd4356431e9b018402f172a214fc7d7a5e9a7e29d8ac

RUN npm install --global bun@1.3.14 \
  && test "$(bun --version)" = "1.3.14"

WORKDIR /workspace


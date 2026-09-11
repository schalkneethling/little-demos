import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, test } from "vite-plus/test";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "../..");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("containerized Playwright infrastructure", () => {
  test("pins the official Noble amd64 image and Bun toolchain", async () => {
    const dockerfile = await readFile(join(repositoryRoot, "tests/e2e/docker/Dockerfile"), "utf8");
    expect(
      dockerfile
        .trimStart()
        .startsWith(
          "FROM mcr.microsoft.com/playwright:v1.62.1-noble@sha256:c091b21d9fae78c76e85cd4356431e9b018402f172a214fc7d7a5e9a7e29d8ac\n",
        ),
    ).toBe(true);
    expect(dockerfile).toMatch(/npm install --global bun@1\.3\.14/);
    expect(dockerfile).not.toMatch(/latest/);
  });

  test("runs build and Playwright in the container with frozen isolated dependencies", async () => {
    const entrypoint = await readFile(
      join(repositoryRoot, "scripts/testing/playwright-container.sh"),
      "utf8",
    );
    expect(entrypoint).toContain("bun install --frozen-lockfile");
    expect(entrypoint).toContain("bun run build");
    expect(entrypoint).toContain("./node_modules/.bin/playwright test");
    expect(entrypoint).toContain("VERSION_CODENAME=noble");
  });

  test("forces amd64 and never exposes host node_modules to the test container", async () => {
    const directory = await mkdtemp(join(tmpdir(), "little-demos-docker-test-"));
    temporaryDirectories.push(directory);
    const dockerLog = join(directory, "docker.log");
    const fakeDocker = join(directory, "docker");
    await writeFile(
      fakeDocker,
      `#!/usr/bin/env bash\nprintf 'CALL\\n' >> "$DOCKER_LOG"\nprintf '<%s>\\n' "$@" >> "$DOCKER_LOG"\n`,
    );
    await chmod(fakeDocker, 0o755);

    await execFileAsync(
      "bash",
      [
        join(repositoryRoot, "scripts/testing/playwright-docker.sh"),
        "tests/e2e/phase4.spec.ts",
        "--grep",
        "arcade overview",
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          DOCKER_BIN: fakeDocker,
          DOCKER_LOG: dockerLog,
          PLAYWRIGHT_HOST_UID: "1234",
          PLAYWRIGHT_HOST_GID: "4321",
        },
      },
    );

    const calls = (await readFile(dockerLog, "utf8")).split("CALL\n").filter(Boolean);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("<build>\n<--platform>\n<linux/amd64>");
    expect(calls[1]).toContain("<run>\n<--rm>\n<--init>");
    expect(calls[1]).toContain("<--platform>\n<linux/amd64>");
    expect(calls[1]).toContain("<--user>\n<1234:4321>");
    expect(calls[1]).toContain(
      "<--tmpfs>\n</workspace/node_modules:rw,exec,nosuid,nodev,mode=0755,uid=1234,gid=4321>",
    );
    expect(calls[1]).toContain(`<type=bind,source=${repositoryRoot},target=/workspace>`);
    expect(calls[1]).toContain("<--cap-drop>\n<ALL>");
    expect(calls[1]).toContain("<--security-opt>\n<no-new-privileges>");
    expect(calls[1]).toContain("<tests/e2e/phase4.spec.ts>\n<--grep>\n<arcade overview>");
  });

  test("uses the same Docker package entrypoint in CI", async () => {
    const packageJson = JSON.parse(
      await readFile(join(repositoryRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const workflow = await readFile(join(repositoryRoot, ".github/workflows/ci.yml"), "utf8");
    const config = await readFile(join(repositoryRoot, "playwright.config.ts"), "utf8");

    expect(packageJson.scripts["test:e2e"]).toBe("bash scripts/testing/playwright-docker.sh");
    expect(packageJson.scripts["test:e2e:update"]).toBe(
      "bash scripts/testing/playwright-docker.sh --update-snapshots=changed",
    );
    expect(workflow).toContain("run: vp run test:e2e");
    expect(workflow).not.toContain("run: vp build");
    expect(workflow).not.toContain("playwright install");
    expect(workflow).toContain("contents: read");
    expect(config).toContain("workers: 1");
    expect(config).toContain("reuseExistingServer: false");
  });
});

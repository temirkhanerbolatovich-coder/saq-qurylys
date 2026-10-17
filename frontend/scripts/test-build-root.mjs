import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { URL } from "node:url";
import loadConfig from "next/dist/server/config.js";
import { PHASE_PRODUCTION_BUILD } from "next/constants.js";

test("parent lockfile cannot relocate the frontend standalone server", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "saq-build-root-"));
  try {
    const frontend = path.join(fixture, "frontend");
    await mkdir(frontend);
    await mkdir(path.join(fixture, ".git"));
    await writeFile(path.join(fixture, "package-lock.json"), "{}");
    await writeFile(path.join(frontend, "package-lock.json"), "{}");
    await writeFile(
      path.join(frontend, "next.config.ts"),
      await readFile(new URL("../next.config.ts", import.meta.url)),
    );
    const config = await loadConfig.default(PHASE_PRODUCTION_BUILD, frontend, {
      silent: true,
    });
    assert.equal(config.outputFileTracingRoot, frontend);
    assert.equal(config.turbopack.root, frontend);
    assert.equal(config.output, "standalone");
  } finally {
    assert.equal(path.dirname(path.resolve(fixture)), path.resolve(tmpdir()));
    assert.ok(path.basename(fixture).startsWith("saq-build-root-"));
    await rm(fixture, { recursive: true, force: true });
  }
});

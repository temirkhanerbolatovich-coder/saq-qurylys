import assert from "node:assert/strict";
import { test } from "node:test";
import { assertIsolatedE2E } from "./e2e-safety.mjs";

test("E2E rejects implicit defaults, public sites and the working local port", () => {
  for (const origin of [
    undefined,
    "http://localhost:3000",
    "https://example.org",
    "http://example.org:3090",
    "http://localhost:3090/path",
    "http://user:password@localhost:3090",
  ]) {
    assert.throws(() =>
      assertIsolatedE2E({
        SAQ_ISOLATED_ACCEPTANCE: "1",
        SAQ_E2E_BASE_URL: origin,
      }),
    );
  }
  assert.throws(() =>
    assertIsolatedE2E({ SAQ_E2E_BASE_URL: "http://localhost:3090" }),
  );
});

test("E2E accepts explicit disposable loopback origins", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const origin = `http://${host}:3090`;
    assert.equal(
      assertIsolatedE2E({
        SAQ_ISOLATED_ACCEPTANCE: "1",
        SAQ_E2E_BASE_URL: origin,
      }),
      origin,
    );
  }
});

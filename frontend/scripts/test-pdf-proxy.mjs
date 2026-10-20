import { test } from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import { GET, POST } from "../app/api/[...path]/route.ts";

const { AbortSignal, AbortController, DOMException, Response, Headers, URL } =
  globalThis;

test("PDF downloads allow the renderer budget while commands and other routes retain 15 seconds", async (t) => {
  const original = process.env.PDF_PROXY_TIMEOUT_MS;
  const deadlines = [];
  t.mock.method(AbortSignal, "timeout", (value) => {
    deadlines.push(value);
    return new AbortController().signal;
  });
  t.mock.method(globalThis, "fetch", async () => new Response("result"));
  const invoke = async (path, method = "GET") => {
    const response = await (method === "GET" ? GET : POST)(
      {
        method,
        headers: new Headers(),
        nextUrl: new URL("https://demo.example.test/api/" + path.join("/")),
      },
      { params: Promise.resolve({ path }) },
    );
    assert.equal(response.status, 200);
    await response.text();
    return deadlines.at(-1);
  };
  try {
    const report = ["v1", "properties", "demo-id", "report.pdf"];
    delete process.env.PDF_PROXY_TIMEOUT_MS;
    assert.equal(await invoke(report), 75_000);
    for (const value of ["50000", "75000"]) {
      process.env.PDF_PROXY_TIMEOUT_MS = value;
      assert.equal(await invoke(report), Number(value));
      assert.equal(await invoke(["v1", "signals", "id", "pdf"]), Number(value));
      assert.equal(
        await invoke(["v1", "exports", "assets", "id", "pdf"]),
        Number(value),
      );
    }
    for (const value of [
      "75001",
      "0",
      "-1",
      "broken",
      "50000ms",
      "1.5",
      "Infinity",
    ]) {
      process.env.PDF_PROXY_TIMEOUT_MS = value;
      assert.equal(await invoke(report), 75_000);
    }
    process.env.PDF_PROXY_TIMEOUT_MS = "50000";
    for (const path of [
      ["v1", "monitoring", "threads", "search"],
      ["v1", "properties", "id"],
      ["v1", "assets", "id"],
      ["v1", "other", "id", "report.pdf"],
      [...report, "extra"],
    ])
      assert.equal(await invoke(path), 15_000);
    assert.equal(await invoke(["v1", "signals", "id", "pdf"], "POST"), 15_000);
  } finally {
    if (original === undefined) delete process.env.PDF_PROXY_TIMEOUT_MS;
    else process.env.PDF_PROXY_TIMEOUT_MS = original;
  }
});

test("an upstream timeout remains a safe 503 response", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new DOMException("deadline", "TimeoutError");
  });
  const response = await GET(
    {
      method: "GET",
      headers: new Headers(),
      nextUrl: new URL(
        "https://demo.example.test/api/v1/properties/id/report.pdf",
      ),
    },
    {
      params: Promise.resolve({
        path: ["v1", "properties", "id", "report.pdf"],
      }),
    },
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "API_UNAVAILABLE");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("cancelling a downstream request also aborts the bounded upstream read", async (t) => {
  const controller = new AbortController();
  let upstreamSignal;
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    upstreamSignal = init.signal;
    controller.abort();
    assert.equal(upstreamSignal.aborted, true);
    throw new DOMException("cancelled", "AbortError");
  });
  const response = await GET(
    {
      method: "GET",
      headers: new Headers(),
      signal: controller.signal,
      nextUrl: new URL(
        "https://demo.example.test/api/v1/properties/id/report.pdf",
      ),
    },
    {
      params: Promise.resolve({
        path: ["v1", "properties", "id", "report.pdf"],
      }),
    },
  );
  assert.equal(response.status, 503);
  assert.equal(upstreamSignal.aborted, true);
});

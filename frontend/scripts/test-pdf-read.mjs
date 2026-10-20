import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const { URL, Response, DOMException, AbortController, Headers, Blob } =
  globalThis;

// Load the real browser helper without emitting build files; Node cannot strip
// its constructor parameter property or resolve its extensionless TS import.
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  ).toString("base64")}`;
const presentation = moduleUrl(
  await readFile(new URL("../lib/presentation.ts", import.meta.url), "utf8"),
);
const source = await readFile(
  new URL("../lib/pdf-read.ts", import.meta.url),
  "utf8",
);
const { PDF_CLIENT_TIMEOUT_MS, PdfReadError, readPdf, pdfReadMessage } =
  await import(
    moduleUrl(source.replace('"./presentation"', `"${presentation}"`))
  );

const bytes = "%PDF-1.7\n% DEMO synthetic download\n%%EOF";
function pdf() {
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="demo-result.pdf"',
    },
  });
}
function waitForAbort(_url, options) {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(new DOMException("aborted", "AbortError"));
    if (options.signal.aborted) abort();
    else options.signal.addEventListener("abort", abort, { once: true });
  });
}

test("one PDF GET remains pending past 25 seconds and succeeds inside the 90 second budget", async (t) => {
  assert.equal(PDF_CLIENT_TIMEOUT_MS, 90_000);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fetch = t.mock.method(globalThis, "fetch", (_url, options) => {
    assert.equal(options.method || "GET", "GET");
    assert.equal(options.cache, "no-store");
    return new Promise((resolve) =>
      globalThis.setTimeout(() => resolve(pdf()), 26_000),
    );
  });
  let completed = false;
  const result = readPdf(
    "/demo.pdf",
    new AbortController().signal,
    "fallback.pdf",
  );
  void result.then(() => (completed = true));
  t.mock.timers.tick(25_001);
  await Promise.resolve();
  assert.equal(completed, false);
  t.mock.timers.tick(999);
  const downloaded = await result;
  assert.equal(await downloaded.blob.text(), bytes);
  assert.equal(downloaded.filename, "demo-result.pdf");
  assert.equal(fetch.mock.callCount(), 1);
});

test("manual cancellation and a pre-cancelled request are CANCELLED in RU/KZ", async (t) => {
  t.mock.method(globalThis, "fetch", waitForAbort);
  for (const preCancelled of [false, true]) {
    const controller = new AbortController();
    if (preCancelled) controller.abort();
    const result = readPdf("/demo.pdf", controller.signal, "fallback.pdf");
    controller.abort();
    await assert.rejects(result, (cause) => {
      assert.ok(cause instanceof PdfReadError);
      assert.equal(cause.kind, "CANCELLED");
      assert.match(pdfReadMessage(cause, "ru"), /отменена/);
      assert.match(pdfReadMessage(cause, "kk"), /тоқтатылды/);
      return true;
    });
  }
});

test("90 second expiry is TIMEOUT with distinct RU/KZ recovery text", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fetch = t.mock.method(globalThis, "fetch", waitForAbort);
  const result = readPdf(
    "/demo.pdf",
    new AbortController().signal,
    "fallback.pdf",
  );
  const assertion = assert.rejects(result, (cause) => {
    assert.equal(cause.kind, "TIMEOUT");
    assert.match(pdfReadMessage(cause, "ru"), /Время ожидания PDF истекло/);
    assert.match(pdfReadMessage(cause, "kk"), /күту уақыты аяқталды/);
    return true;
  });
  t.mock.timers.tick(89_999);
  assert.equal(fetch.mock.calls[0].arguments[1].signal.aborted, false);
  t.mock.timers.tick(1);
  await assertion;
  assert.equal(fetch.mock.callCount(), 1);
});

for (const [label, contentType, body] of [
  ["wrong content type", "text/html", bytes],
  ["misleading PDF content type", "application/pdf-untrusted", bytes],
  ["missing content type", null, bytes],
  ["empty blob", "application/pdf", ""],
  ["invalid signature", "application/pdf", "not a PDF"],
]) {
  test(`${label} is INVALID and never accepted as a PDF`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => {
      const response = new Response(body, {
        headers: contentType ? { "content-type": contentType } : {},
      });
      if (contentType === null) response.headers.delete("content-type");
      return response;
    });
    await assert.rejects(
      readPdf("/demo.pdf", new AbortController().signal, "fallback.pdf"),
      (cause) => cause instanceof PdfReadError && cause.kind === "INVALID",
    );
  });
}

test("500/503 failures make one GET each; a later caller action explicitly retries", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let status = 500;
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    status === 200
      ? pdf()
      : Response.json(
          { error: { message: "DEMO PDF временно недоступен" } },
          { status },
        ),
  );
  for (const failedStatus of [500, 503]) {
    status = failedStatus;
    await assert.rejects(
      readPdf("/demo.pdf", new AbortController().signal, "fallback.pdf"),
      (cause) => {
        assert.equal(cause.kind, "FAILED");
        assert.equal(
          pdfReadMessage(cause, "ru"),
          "DEMO PDF временно недоступен",
        );
        assert.match(pdfReadMessage(cause, "kk"), /мүмкін болмады/);
        return true;
      },
    );
    t.mock.timers.tick(90_000);
    assert.equal(fetch.mock.callCount(), failedStatus === 500 ? 1 : 2);
  }
  status = 200;
  assert.equal(
    (await readPdf("/demo.pdf", new AbortController().signal, "fallback.pdf"))
      .filename,
    "demo-result.pdf",
  );
  assert.equal(fetch.mock.callCount(), 3);
});

test("cancel during body delivery rejects even if the underlying blob ignores abort", async (t) => {
  let release;
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    headers: new Headers({ "content-type": "application/pdf" }),
    blob: () => new Promise((resolve) => (release = resolve)),
  }));
  const controller = new AbortController();
  const result = readPdf("/demo.pdf", controller.signal, "fallback.pdf");
  await Promise.resolve();
  controller.abort();
  release(new Blob([bytes]));
  await assert.rejects(result, (cause) => cause.kind === "CANCELLED");
});

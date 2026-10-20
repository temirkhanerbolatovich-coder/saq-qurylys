import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { test } from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../lib/api.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { date } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const timestamp = "2026-10-20T18:25:00Z";
const expected = (locale) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Qyzylorda",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));

test("explicit RU/KZ dates preserve the instant and Qyzylorda timezone", () => {
  assert.equal(date(timestamp, "ru"), expected("ru-RU"));
  assert.equal(date(timestamp, "kk"), expected("kk-KZ"));
  assert.notEqual(date(timestamp, "kk"), date(timestamp, "ru"));
  assert.equal(timestamp, "2026-10-20T18:25:00Z");
});

test("missing and malformed dates show a localized unknown instead of a capture date", () => {
  for (const value of [null, "", "not-a-date"]) {
    assert.equal(date(value, "ru"), "Не установлена");
    assert.equal(date(value, "kk"), "Анықталмаған");
  }
});

test("default language follows document changes and remains safe during server render", (t) => {
  assert.equal(typeof document, "undefined");
  assert.equal(date(timestamp), expected("ru-RU"));
  globalThis.document = {
    documentElement: { lang: "kk" },
  };
  t.after(() => delete globalThis.document);
  assert.equal(date(timestamp), expected("kk-KZ"));
  assert.equal(date(null), "Анықталмаған");
  globalThis.document.documentElement.lang = "ru";
  assert.equal(date(timestamp), expected("ru-RU"));
  assert.equal(date(null), "Не установлена");
});

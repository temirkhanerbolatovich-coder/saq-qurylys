import { test } from "node:test";
import assert from "node:assert/strict";
import process from "node:process";

test("map provider configuration fails closed and preserves safe public values", async () => {
  const template = "https://tiles.example.test/{z}/{x}/{y}.png";
  const cases = [
    [undefined, undefined, undefined, true],
    ["", undefined, undefined, true],
    [template, "Provider <literal text>", "https://example.test/license", true],
    ["disabled", undefined, undefined, false],
    ["http://tiles.example.test/{z}/{x}/{y}", undefined, undefined, false],
    [
      "https://user:password@example.test/{z}/{x}/{y}",
      undefined,
      undefined,
      false,
    ],
    ["https://example.test/{z}/{x}/{y}/{token}", undefined, undefined, false],
    ["https://example.test/tiles.png", undefined, undefined, false],
    [template, "", undefined, false],
    [template, "Provider", "javascript:alert(1)", false],
  ];
  const names = [
    "NEXT_PUBLIC_MAP_TILE_URL",
    "NEXT_PUBLIC_MAP_ATTRIBUTION",
    "NEXT_PUBLIC_MAP_ATTRIBUTION_URL",
  ];
  const original = names.map((name) => process.env[name]);
  try {
    for (const [index, values] of cases.entries()) {
      names.forEach((name, field) => {
        if (values[field] === undefined) delete process.env[name];
        else process.env[name] = values[field];
      });
      const { mapConfig } = await import(`../lib/map-config.ts?case=${index}`);
      const config = mapConfig();
      assert.equal(config !== null, values[3], `case ${index}`);
      if (index === 2) assert.equal(config.attribution, values[1]);
    }
  } finally {
    names.forEach((name, index) => {
      if (original[index] === undefined) delete process.env[name];
      else process.env[name] = original[index];
    });
  }
});

import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { testOrigin } from "./support";

test("SQ08 measure initial dossier requests against the isolated API", async ({
  browser,
  baseURL,
}, testInfo) => {
  test.skip(
    process.env.SAQ_SQ_NETWORK_MEASURE !== "1",
    "Explicit measurement run",
  );
  test.setTimeout(60_000);
  expect(new URL(testOrigin).hostname).toBe("127.0.0.1");
  const samples = [];
  for (let index = 0; index < 5; index++) {
    const context = await browser.newContext({ baseURL });
    try {
      const csrf = await context.request.get("/api/v1/auth/csrf");
      const login = await context.request.post("/api/v1/auth/login", {
        headers: {
          Origin: testOrigin,
          "X-CSRF-Token": (await csrf.json()).csrf_token,
        },
        data: {
          username: process.env.BOOTSTRAP_ANALYST_USERNAME || "analyst",
          password: process.env.BOOTSTRAP_ANALYST_PASSWORD,
        },
      });
      expect(login.status()).toBe(200);
      const registry = await context.request.get(
        "/api/v1/properties?page_size=100",
      );
      const property = (await registry.json()).items.find(
        (row: { name: string }) => row.name.includes("Алтай"),
      );
      expect(property).toBeTruthy();
      const page = await context.newPage();
      const responses: Promise<{
        endpoint: string;
        status: number;
        decodedBytes: number;
        latencyMs: number;
      }>[] = [];
      const writes: string[] = [];
      page.on("request", (request) => {
        if (
          new URL(request.url()).pathname.startsWith("/api/v1/") &&
          request.method() !== "GET"
        )
          writes.push(request.method());
      });
      page.on("response", (response) => {
        const url = new URL(response.url());
        if (!url.pathname.startsWith("/api/v1/")) return;
        responses.push(
          (async () => {
            const body = await response.body();
            const timing = response.request().timing();
            return {
              endpoint: url.pathname + url.search,
              status: response.status(),
              decodedBytes: body.byteLength,
              latencyMs: timing.responseEnd - timing.requestStart,
            };
          })(),
        );
      });
      await page.goto(`/properties/${property.id}`);
      await expect(
        page.getByRole("heading", { name: property.name, exact: true }),
      ).toBeVisible();
      await expect(page.locator("#dossier-summary")).toBeVisible();
      const firstUsefulMs = await page.evaluate(() => performance.now());
      await page.waitForLoadState("networkidle");
      const requests = await Promise.all(responses);
      expect(requests.every((request) => request.status === 200)).toBe(true);
      expect(writes).toEqual([]);
      samples.push({ index, firstUsefulMs, requests });
    } finally {
      await context.close();
    }
  }
  const phase = process.env.SAQ_SQ_NETWORK_PHASE || "unspecified";
  const output = process.env.SAQ_SQ_NETWORK_EVIDENCE || testInfo.outputDir;
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, `${phase}.json`),
    JSON.stringify(
      {
        phase,
        environment:
          "Disposable loopback API/PostgreSQL and production standalone frontend; five fresh browser contexts, no network throttling",
        workspaceSha256: createHash("sha256")
          .update(await readFile("components/workspace.tsx"))
          .digest("hex"),
        samples,
      },
      null,
      2,
    ),
    "utf8",
  );
});

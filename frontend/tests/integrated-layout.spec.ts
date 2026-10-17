import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { login, testOrigin } from "./support";

test("integrated dashboard, map and selected signal stay usable at all target widths", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eef1ec"/></svg>',
    }),
  );
  let signals = await (
    await page.request.get("/api/v1/signals?page_size=1")
  ).json();
  if (!signals.items.length) {
    const registry = await (
      await page.request.get("/api/v1/properties?page_size=1")
    ).json();
    const property = registry.items[0];
    const csrf = await (await page.request.get("/api/v1/auth/csrf")).json();
    const created = await page.request.post("/api/v1/signals", {
      headers: {
        Origin: testOrigin,
        "X-CSRF-Token": csrf.csrf_token,
        "Idempotency-Key": randomUUID(),
      },
      data: {
        property_id: property.id,
        expected_risk_revision: property.risk.revision,
      },
    });
    expect(created.status()).toBe(201);
    signals = { items: [await created.json()] };
  }
  await mkdir("../output/qa/integration", { recursive: true });
  const views = [
    { name: "dashboard", url: "/dashboard", ready: ".dashboard-analytics" },
    { name: "map", url: "/properties?view=map", ready: ".map-section-heading" },
    {
      name: "signals",
      url: `/signals?signal_id=${signals.items[0].id}`,
      ready: '[data-testid="signal-detail"]',
    },
  ];
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const view of views) {
      await page.goto(view.url);
      await expect(page.locator(view.ready)).toBeVisible();
      if (view.name === "dashboard") {
        await expect(page.locator(".risk-bar-row")).toHaveCount(3);
        await expect(page.locator(".priority-list li")).not.toHaveCount(0);
        await expect(page.locator(".workflow-links a")).toHaveCount(3);
        for (const link of await page.locator(".workflow-links a").all()) {
          expect(
            await link.evaluate(
              (element) => element.scrollWidth <= element.clientWidth,
            ),
          ).toBe(true);
        }
      }
      await expect(
        page.getByRole("navigation", { name: "Основная навигация" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${view.name} at ${width}px`,
      ).toBe(true);
      if (view.name === "signals") {
        await expect(page.locator(".signal-legal-note")).toBeVisible();
        await expect(page.locator('[id^="signal-pdf-"]')).toBeAttached();
        await expect(page.locator('[id^="signal-history-"]')).toBeAttached();
        for (const card of await page.locator(".signals-summary-card").all()) {
          const label = await card.locator("span").boundingBox();
          const value = await card.locator("strong").boundingBox();
          expect(label).not.toBeNull();
          expect(value).not.toBeNull();
          expect(value!.y).toBeGreaterThanOrEqual(label!.y + label!.height);
        }
      }
      await page.screenshot({
        path: `../output/qa/integration/${view.name}-${width}.png`,
        fullPage: width === 375 || width === 1440,
      });
    }
  }
});

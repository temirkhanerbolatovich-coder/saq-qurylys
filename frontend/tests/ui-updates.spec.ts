import { expect, test } from "@playwright/test";
import type { Advertisement, Page } from "../lib/types";
import { login } from "./support";

test("publication charts disclose their scope, count each source once and recover from errors", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const catalog: Page<Advertisement> = await (
    await page.request.get("/api/v1/advertisements?page_size=1")
  ).json();
  const original = catalog.items[0];
  const asset = original.assets[0];
  expect(asset).toBeTruthy();
  // Presentation fixtures only; these records never reach the database.
  const items: Advertisement[] = [
    { ...original, is_demo: true, status: "NEW" },
    {
      ...original,
      id: "fixture-image",
      source_label: "DEMO fixture: image with a source link",
      is_demo: false,
      source_url: "https://example.invalid/image",
      assets: [{ ...asset, kind: "IMAGE" }],
      status: "ANALYZING",
    },
    {
      ...original,
      id: "fixture-site",
      source_label: "DEMO fixture: site",
      is_demo: false,
      source_url: "https://example.invalid/article",
      assets: [{ ...asset, kind: "HTML" }],
      status: "READY_FOR_REVIEW",
    },
    {
      ...original,
      id: "fixture-text",
      source_label: "DEMO fixture: text",
      is_demo: false,
      source_url: null,
      assets: [],
      status: "REVIEWED",
    },
    {
      ...original,
      id: "fixture-failed",
      source_label: "DEMO fixture: source link",
      is_demo: false,
      source_url: "https://example.invalid/failed",
      assets: [],
      status: "FAILED",
    },
  ];
  let unavailable = false;
  await page.route("**/api/v1/advertisements?page_size=100", (route) =>
    unavailable
      ? route.fulfill({
          status: 503,
          json: { error: { message: "DEMO distribution unavailable" } },
        })
      : route.fulfill({
          json: { items, total: 205, page: 1, page_size: 100 },
        }),
  );
  await page.reload();
  const statuses = page.getByRole("region", { name: "Статус публикаций" });
  const sources = page.getByRole("region", { name: "Материалы по источникам" });
  await expect(statuses).toContainText("Показано 5 из 205 публикаций");
  await expect(sources).toContainText("не по всему реестру");
  for (const [label, count] of [
    ["Сайты и ссылки", 2],
    ["Текстовые материалы", 1],
    ["Изображения", 1],
    ["DEMO-материалы", 1],
  ] as const) {
    await expect(
      sources
        .locator(".analytics-bar-row")
        .filter({ hasText: label })
        .locator("strong"),
    ).toHaveText(String(count));
  }
  await expect(statuses.locator(".analytics-bar-row strong")).toHaveText([
    "1",
    "1",
    "1",
    "1",
    "1",
  ]);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(sources).toBeVisible();
    if (width >= 1024) {
      const left = await statuses.boundingBox();
      const right = await sources.boundingBox();
      expect(left).toBeTruthy();
      expect(right).toBeTruthy();
      expect(Math.abs(left!.y - right!.y)).toBeLessThan(2);
      expect(Math.abs(left!.width - right!.width)).toBeLessThan(2);
    }
  }
  await page
    .getByRole("button", { name: "Подробный вид", exact: true })
    .click();
  await expect(statuses).toContainText("Показано 5 из 205 публикаций");
  const metrics = page.getByRole("region", { name: "Ключевые показатели" });
  await expect(metrics.getByRole("link")).toHaveCount(4);
  await expect(
    metrics.getByRole("link").filter({ hasText: "Приоритетная проверка" }),
  ).toHaveAttribute("href", "/properties?zone=RED");
  unavailable = true;
  await page.reload();
  await expect(statuses.getByRole("alert")).toContainText(
    "DEMO distribution unavailable",
  );
  await expect(statuses.locator(".analytics-bars")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Открыть очередь решений", exact: true }),
  ).toBeVisible();
  unavailable = false;
  await statuses
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(statuses).toContainText("Показано 5 из 205 публикаций");
});

test("publication cards keep filter context while details retain the full original and source SHA", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const catalog: Page<Advertisement> = await (
    await page.request.get("/api/v1/advertisements?page_size=1")
  ).json();
  const original: Advertisement = {
    ...catalog.items[0],
    source_label: "DEMO: длинный исходный материал",
    original_text: "DEMO исходный текст. ".repeat(50),
    source_url: `https://example.invalid/${"long-source-".repeat(30)}`,
    status: "NEW",
    is_demo: true,
  };
  const query = "status=NEW&page=2&page_size=10";
  await page.route(`**/api/v1/advertisements?${query}`, (route) =>
    route.fulfill({
      json: { items: [original], total: 21, page: 2, page_size: 10 },
    }),
  );
  await page.route(`**/api/v1/advertisements/${original.id}`, (route) =>
    route.fulfill({ json: original }),
  );
  await page.goto(`/advertisements?${query}`);
  const card = page.getByRole("link", {
    name: original.source_label,
    exact: true,
  });
  await expect(card).toContainText("…");
  expect((await card.locator("p").innerText()).length).toBeLessThan(
    original.original_text.length,
  );
  await expect(
    page.getByRole("navigation", { name: "Страницы публикаций" }),
  ).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get("materials") === query,
  );
  await expect(page.locator(".original-text")).toHaveText(
    original.original_text.trim(),
  );
  await expect(page.locator(".advertisement-assets")).toContainText(
    original.assets[0].sha256,
  );
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("link", { name: "К публикациям" }).click();
  await expect(page).toHaveURL(`/advertisements?${query}`);
  await expect(
    page.getByLabel("Состояние обработки", { exact: true }),
  ).toHaveValue("NEW");
});

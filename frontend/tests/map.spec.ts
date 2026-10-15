import { test, expect } from "@playwright/test";
import { login } from "./support";
import type { Page as ResultPage, Property } from "../lib/types";

// CI never requests public tiles. This only substitutes the base layer;
// coordinates, scores, filters and property cards use the authenticated API.
test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#edf2ed"/></svg>',
    }),
  );
});

test("map uses API coordinates/risk, shares filters, and opens the selected card", async ({
  page,
}) => {
  await login(page);
  const response = await page.request.get("/api/v1/properties?zone=RED");
  const data: ResultPage<Property> = await response.json();
  const row = data.items[0];
  await page.getByRole("link", { name: "Открыть карту", exact: true }).click();
  await expect(page.locator(".property-marker")).toHaveCount(8);
  await expect(
    page.getByRole("link", { name: "OpenStreetMap contributors", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Фильтр по зоне").selectOption("RED");
  await expect(page).toHaveURL(/view=map.*zone=RED/);
  await expect(page.locator(".property-marker")).toHaveCount(data.items.length);
  const marker = page.getByRole("button", {
    name: `Выбрать ${row.name}: ${row.risk.score}, Красная зона`,
    exact: true,
  });
  await marker.focus();
  await marker.press("Enter");
  const card = page.getByRole("region", {
    name: "Выбранный объект",
    exact: true,
  });
  await expect(card).toBeFocused();
  await expect(card.getByRole("heading", { name: row.name })).toBeVisible();
  await expect(card.locator(".zone")).toContainText(String(row.risk.score));
  await page.getByRole("button", { name: "Список", exact: true }).click();
  await expect(page).toHaveURL(/zone=RED/);
  await expect(page.locator(".property-map")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Карта и список", exact: true })
    .click();
  await page
    .getByRole("button", { name: `Выбрать ${row.name}:`, exact: false })
    .click();
  await card
    .getByRole("link", { name: "Открыть карточку", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/properties/${row.id}$`));
  await expect(page.getByRole("heading", { name: row.name })).toBeVisible();
});

test("missing and invalid coordinates stay in the list and source text cannot become HTML", async ({
  page,
}) => {
  await login(page);
  const response = await page.request.get("/api/v1/properties");
  const data: ResultPage<Property> = await response.json();
  data.items[0].latitude = null;
  data.items[1].longitude = 190;
  data.items[2].latitude = 90;
  data.items[3].name = '<img src=x onerror="window.mapInjection=true">';
  await page.route(/\/api\/v1\/properties\?/, (route) =>
    route.fulfill({ json: data }),
  );
  await page.goto("/properties?view=map");
  await expect(page.locator(".property-marker")).toHaveCount(5);
  await expect(
    page.getByText("Без пригодных координат: 3", { exact: false }),
  ).toBeVisible();
  await expect(page.locator("#property-list tbody tr")).toHaveCount(8);
  await page
    .getByRole("button", {
      name: `Выбрать ${data.items[3].name}:`,
      exact: false,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: data.items[3].name, exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => Object.hasOwn(window, "mapInjection"))).toBe(
    false,
  );
  for (const row of data.items) row.latitude = null;
  await page.reload();
  await expect(
    page.getByText("Нет объектов с координатами для карты.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator("#property-list tbody tr")).toHaveCount(8);
  await expect(page.locator(".property-map")).toHaveCount(0);
});

test("failed tiles preserve markers, retry and the usable list", async ({
  page,
}) => {
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await login(page);
  await page.goto("/properties?view=map");
  await expect(
    page.getByText("Подложка карты недоступна", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".property-marker")).toHaveCount(8);
  await page.getByRole("button", { name: "Повторить карту" }).click();
  await expect(
    page.getByText("Подложка карты недоступна", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".property-marker")).toHaveCount(8);
  await page.getByRole("link", { name: "Перейти к списку объектов" }).click();
  await expect(page.locator("#property-list")).toBeFocused();
  await page.locator("#property-list .object-name").first().click();
  await expect(
    page.getByText("КАРТОЧКА ОБЪЕКТА", { exact: true }),
  ).toBeVisible();
});

test("map pagination is explicit, filters reset page and stale results disappear on API failure", async ({
  page,
}) => {
  await login(page);
  await page.goto("/properties?view=map&page_size=2");
  await expect(page.locator(".property-marker")).toHaveCount(2);
  const firstNames = await page
    .locator("#property-list .object-name")
    .allTextContents();
  await page.getByRole("button", { name: "Следующая", exact: true }).click();
  await expect(
    page.getByText("Страница 2 из 4", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".property-marker")).toHaveCount(2);
  expect(
    await page.locator("#property-list .object-name").allTextContents(),
  ).not.toEqual(firstNames);
  await page.getByLabel("Поиск ЖК или адреса").fill("несуществующий DEMO");
  await expect(
    page.getByText("Объекты по выбранным фильтрам не найдены."),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await expect(page.locator(".property-marker")).toHaveCount(0);
  await page.getByLabel("Поиск ЖК или адреса").fill("");
  await expect(page.locator(".property-marker")).toHaveCount(2);
  await page.route(/\/api\/v1\/properties\?/, (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "DEMO temporary outage" } },
    }),
  );
  await page.getByLabel("Фильтр по основанию").selectOption("UNKNOWN");
  await expect(
    page.getByRole("button", { name: "Повторить загрузку", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".property-marker")).toHaveCount(0);
  await expect(page.locator("#property-list")).toHaveCount(0);
  await page.unroute(/\/api\/v1\/properties\?/);
  await page
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(page.locator(".property-marker")).toHaveCount(2);
});

test("map reflows on mobile and narrow desktop, with keyboard access and no overflow", async ({
  page,
}) => {
  await login(page);
  await page.goto("/properties?view=map");
  for (const width of [390, 640]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator(".property-marker")).toHaveCount(8);
    const marker = page.locator(".property-marker").first();
    await marker.focus();
    await marker.press("Space");
    await expect(
      page.getByRole("region", { name: "Выбранный объект", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("link", { name: "Открыть карточку", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("link", {
        name: "OpenStreetMap contributors",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `../output/qa/map-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Список", exact: true }).click();
    await page
      .getByRole("button", { name: "Карта и список", exact: true })
      .click();
  }
  await page.screenshot({
    path: "../output/qa/map-mobile.png",
    fullPage: true,
  });
});

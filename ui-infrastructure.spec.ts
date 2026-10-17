import { expect, test } from "@playwright/test";
import { login } from "./support";
import type { Page as ResultPage, Property } from "../lib/types";

test("one reset clears registry filters and page while retaining the map view", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await login(page);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(
      "/properties?view=map&q=DEMO&zone=RED&legal_status=UNKNOWN&page=2",
    );
    const reset = page.getByRole("button", {
      name: "Сбросить фильтры",
      exact: true,
    });
    await expect(reset).toBeVisible();
    await reset.click();
    await expect(page).toHaveURL(/\/properties\?view=map$/);
    await expect(page.locator("tbody tr")).toHaveCount(8);
    await expect(page.getByLabel("Поиск ЖК или адреса")).toHaveValue("");
    await expect(page.getByLabel("Поиск ЖК или адреса")).toBeFocused();
    await expect(page.getByLabel("Фильтр по зоне")).toHaveValue("");
    await expect(page.getByLabel("Фильтр по основанию")).toHaveValue("");
    await expect(reset).toHaveCount(0);
    await expect(page.locator(".property-marker")).toHaveCount(8);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("shared pagination uses server metadata and retains the registry filter", async ({
  page,
}) => {
  await login(page);
  const data: ResultPage<Property> = await (
    await page.request.get("/api/v1/properties")
  ).json();
  await page.route(/\/api\/v1\/properties\?/, (route) => {
    const current = Number(
      new URL(route.request().url()).searchParams.get("page") || 1,
    );
    return route.fulfill({
      json: {
        ...data,
        page: current,
        page_size: 1,
        total: 2,
        items: [data.items[current - 1]],
      },
    });
  });
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/properties?q=DEMO");
  const pagination = page.getByRole("navigation", { name: "Страницы реестра" });
  await expect(pagination.getByRole("status")).toHaveText("Страница 1 из 2");
  await expect(
    pagination.getByRole("button", { name: "Предыдущая" }),
  ).toBeDisabled();
  await pagination.getByRole("button", { name: "Следующая" }).click();
  await expect(page).toHaveURL(/q=DEMO&page=2/);
  await expect(pagination.getByRole("status")).toHaveText("Страница 2 из 2");
  await expect(page.locator("tbody")).toContainText(data.items[1].name);
  await expect(
    pagination.getByRole("button", { name: "Следующая" }),
  ).toBeDisabled();
  await pagination.getByRole("button", { name: "Предыдущая" }).click();
  await expect(pagination.getByRole("status")).toHaveText("Страница 1 из 2");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Russian and Kazakh names keep readable glyphs and untruncated accessible names", async ({
  page,
}) => {
  await login(page);
  const data: ResultPage<Property> = await (
    await page.request.get("/api/v1/properties")
  ).json();
  const name =
    "DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І — Строительные документы и проверка очереди";
  data.items[0].name = name;
  await page.route(/\/api\/v1\/properties\?/, (route) =>
    route.fulfill({ json: data }),
  );
  await page.setViewportSize({ width: 375, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/properties");
  const link = page.getByRole("link", { name, exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveText(name);
  await page.screenshot({ path: "../output/design/ru-kz-375.png" });
  expect(
    await link.evaluate((el) => getComputedStyle(el).textOverflow),
  ).not.toBe("ellipsis");
  expect(
    await page.evaluate(() =>
      document.fonts.check('14px "Segoe UI"', "ӘҒҚҢӨҰҮҺІ"),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

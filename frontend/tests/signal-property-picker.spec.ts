import { expect, test } from "@playwright/test";
import { login } from "./support";
import type { Property } from "../lib/types";

test("signal property filter reaches object 101 and retains selection across empty results, errors and reload", async ({
  page,
}) => {
  await login(page);
  const signals = await (
    await page.request.get("/api/v1/signals?page_size=1")
  ).json();
  const target: Property = (
    await (
      await page.request.get(
        `/api/v1/properties/${signals.items[0].property_id}`,
      )
    ).json()
  ).property;
  const fakeRows = Array.from({ length: 100 }, (_, index) => ({
    ...target,
    id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name: `DEMO catalog object ${index}`,
  }));
  let broken = false;
  let namesUnavailable = true;
  await page.route(`**/api/v1/properties/${target.id}`, (route) =>
    namesUnavailable
      ? route.fulfill({
          status: 503,
          json: { error: { message: "DEMO название недоступно" } },
        })
      : route.continue(),
  );
  await page.route("**/api/v1/properties?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("page_size") === "25")
      expect(params.has("is_demo")).toBe(false);
    if (broken && params.get("page_size") === "25")
      return route.fulfill({
        status: 503,
        json: { error: { message: "DEMO поиск объектов недоступен" } },
      });
    const pageNumber = Number(params.get("page") || 1);
    const size = Number(params.get("page_size"));
    const rows =
      params.get("q") === "нет совпадений" ? [] : [...fakeRows, target];
    return route.fulfill({
      json: {
        items: rows.slice((pageNumber - 1) * size, pageNumber * size),
        page: pageNumber,
        page_size: size,
        total: rows.length,
      },
    });
  });
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  await page.goto("/signals");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Часть названий объектов не загружена" }),
  ).toBeVisible();
  namesUnavailable = false;
  await page
    .getByRole("button", { name: "Повторить загрузку названий", exact: true })
    .click();
  await expect(
    page
      .getByLabel("Очередь сигналов")
      .getByRole("heading", { name: target.name, exact: true })
      .first(),
  ).toBeVisible();
  await page.getByText("Дополнительные фильтры", { exact: true }).click();
  const picker = page.getByRole("region", {
    name: "Выбор объекта сигнала",
    exact: true,
  });
  for (let number = 1; number < 5; number++) {
    await expect(
      picker.getByText(`Страница ${number} из 5`, { exact: true }),
    ).toBeVisible();
    await picker
      .getByRole("button", { name: "Следующая страница", exact: true })
      .click();
    await expect(
      picker.getByLabel("Объект сигнала", { exact: true }),
    ).toBeFocused();
  }
  await picker
    .getByLabel("Объект сигнала", { exact: true })
    .selectOption(target.id);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("property_id"))
    .toBe(target.id);
  await expect(
    page
      .getByLabel("Очередь сигналов")
      .getByRole("heading", { name: target.name, exact: true })
      .first(),
  ).toBeVisible();
  const input = picker.getByLabel("Найти ЖК, застройщика или БИН", {
    exact: true,
  });
  await input.fill("нет совпадений");
  await input.press("Enter");
  await expect(
    picker.getByText("Объекты не найдены.", { exact: false }),
  ).toBeVisible();
  await expect(
    picker.getByLabel("Объект сигнала", { exact: true }),
  ).toHaveValue(target.id);
  broken = true;
  await input.fill("ошибка");
  await input.press("Enter");
  await expect(picker.getByRole("alert")).toContainText("недоступен");
  await expect(
    picker.getByLabel("Объект сигнала", { exact: true }),
  ).toHaveValue(target.id);
  broken = false;
  await picker
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(
    picker.getByLabel("Объект сигнала", { exact: true }),
  ).toHaveValue(target.id);
  await page.reload();
  await expect(
    picker.getByLabel("Объект сигнала", { exact: true }),
  ).toHaveValue(target.id);
  await expect(picker.locator(`option[value="${target.id}"]`)).toContainText(
    target.name,
  );
  await page
    .getByRole("button", { name: "Сбросить фильтры сигналов", exact: true })
    .click();
  await expect(
    picker.getByLabel("Объект сигнала", { exact: true }),
  ).toHaveValue("");
  await expect(
    picker.getByLabel("Объект сигнала", { exact: true }),
  ).toBeFocused();
  expect(commands).toEqual([]);
});

test("registry and signal picker send developer search to the real API", async ({
  page,
}) => {
  await login(page);
  const rows = (
    await (await page.request.get("/api/v1/properties?page_size=100")).json()
  ).items as Property[];
  const target = rows[0];
  await page.goto("/properties");
  await page
    .getByLabel("Поиск ЖК или адреса", { exact: false })
    .fill(target.developer.name);
  await expect(page.locator("tbody tr")).toHaveCount(
    rows.filter((row) => row.developer.name === target.developer.name).length,
  );
  await expect(page.locator("tbody")).toContainText(target.name);
  await page.goto("/signals");
  await page.getByText("Дополнительные фильтры", { exact: true }).click();
  const picker = page.getByRole("region", {
    name: "Выбор объекта сигнала",
    exact: true,
  });
  await picker
    .getByLabel("Найти ЖК, застройщика или БИН", { exact: true })
    .fill(target.developer.name);
  await picker.getByRole("button", { name: "Найти ЖК", exact: true }).click();
  await expect(picker.locator("option")).toContainText([
    "Все объекты",
    target.name,
  ]);
});

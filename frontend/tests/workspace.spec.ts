import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

import { login } from "./support";

test("global search opens the registry with an encoded name and preserves the work zones", async ({
  page,
}) => {
  await login(page);
  const search = page.getByRole("search", { name: "Поиск объекта" });
  await search
    .getByLabel("Найти объект или адрес")
    .fill("  DEMO Бәйтерек · очередь 2  ");
  await search
    .getByRole("button", { name: "Найти объект", exact: true })
    .click();
  await expect(page).toHaveURL(/\/properties\?q=/);
  expect(new URL(page.url()).searchParams.get("q")).toBe(
    "DEMO Бәйтерек · очередь 2",
  );
  await expect(page.getByLabel("Поиск ЖК или адреса")).toHaveValue(
    "DEMO Бәйтерек · очередь 2",
  );
  await expect(
    page
      .getByRole("navigation", { name: "Основная навигация" })
      .getByRole("link"),
  ).toHaveCount(5);
});

test("dashboard analytics use server totals and distinguish legal decisions from valid grounds", async ({
  page,
}) => {
  await login(page);
  const summary = await (
    await page.request.get("/api/v1/dashboard/summary")
  ).json();
  const signals = await (
    await page.request.get("/api/v1/signals?page_size=1")
  ).json();
  for (const [index, zone] of ["RED", "YELLOW", "GREEN"].entries()) {
    await expect(
      page.locator(".risk-bar-row").nth(index).locator("strong"),
    ).toHaveText(String(summary.zones[zone]));
  }
  const decisions = page.locator(".verification-card");
  await expect(decisions.locator(".verification-legend dd").first()).toHaveText(
    String(summary.property_count - summary.unknown_legal_bases),
  );
  await expect(decisions.locator(".verification-legend dd").last()).toHaveText(
    String(summary.unknown_legal_bases),
  );
  await expect(decisions).toContainText(
    "Это не число действующих правовых оснований",
  );
  await expect(page.locator(".history-card")).toContainText(
    `Всего сигналов: ${signals.total}`,
  );
  await expect(page.locator(".history-card")).toContainText(
    "Недостаточно данных",
  );
  await expect(
    page.locator(".history-card canvas, .history-card svg.chart"),
  ).toHaveCount(0);
});

test("anonymous visitor is redirected to login", async ({ page }) => {
  await page.goto("/properties");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Вход в систему" }),
  ).toBeVisible();
});

test("dashboard and evidence come from authenticated API", async ({ page }) => {
  await login(page);
  const summary = await (
    await page.request.get("/api/v1/dashboard/summary")
  ).json();
  const newMaterials = await (
    await page.request.get("/api/v1/advertisements?status=NEW&page_size=1")
  ).json();
  expect(summary.new_advertisements).toBe(newMaterials.total);
  const newQueue = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Новые публикации", exact: true }),
  });
  await expect(newQueue.locator(".rail-number")).toHaveText(
    String(summary.new_advertisements),
  );
  await expect(
    newQueue.getByRole("link", { name: "Открыть новые материалы" }),
  ).toHaveAttribute("href", "/advertisements?status=NEW");
  await expect(
    page.getByRole("link", { name: "DEMO Бәйтерек · очередь 2", exact: true }),
  ).toBeVisible();
  await mkdir("../output/qa", { recursive: true });
  await page.screenshot({ path: "../output/qa/dashboard.png", fullPage: true });
  await page.getByRole("link", { name: "Объекты", exact: true }).click();
  await page.getByLabel("Фильтр по зоне").selectOption("RED");
  await expect(page).toHaveURL(/zone=RED/);
  await expect(page.getByText("Найдено объектов: 1")).toBeVisible();
  await page
    .getByRole("link", { name: "DEMO Бәйтерек · очередь 2", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "DEMO Бәйтерек · очередь 2" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Доказательства", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("DEMO заключение:", { exact: false }),
  ).toBeVisible();
  const source = page.getByRole("link", { name: "Скачать исходник" });
  const response = await page.request.get((await source.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Синтетический учебный документ");
});

test("new text draft survives navigation and saves exact input", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("link", { name: "Добавить публикацию", exact: true })
    .click();
  const label = `DEMO browser ${Date.now()}`;
  const text =
    "Жаңа DEMO хабарландыру. Ақылы брондау 123 000 теңге.\nОригинал — без изменений.";
  await page.getByLabel("Источник / описание происхождения").fill(label);
  await page.getByLabel("Оригинальный текст").fill(text);
  await page.getByRole("link", { name: "Объекты", exact: true }).click();
  await page
    .getByRole("link", { name: "Добавить публикацию", exact: true })
    .click();
  await expect(page.getByLabel("Оригинальный текст")).toHaveValue(text);
  await page
    .getByRole("button", { name: "Сохранить публикацию", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Публикация добавлена" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Открыть публикацию", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: label })).toBeVisible();
  await expect(page.locator(".original-text")).toHaveText(text);
  await expect(page.locator("dd").first()).toHaveText("Не установлена");
  await page.reload();
  await expect(page.locator(".original-text")).toHaveText(text);
  await page.screenshot({
    path: "../output/qa/new-advertisement.png",
    fullPage: true,
  });
});

test("mobile registry stays usable without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("link", { name: "Объекты", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Объекты", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "DEMO Самал · очередь 1", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "../output/qa/mobile.png", fullPage: true });
});

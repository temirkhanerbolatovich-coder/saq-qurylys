import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

import { login } from "./support";

test("anonymous visitor is redirected to login", async ({ page }) => {
  await page.goto("/properties");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Вход в систему" }),
  ).toBeVisible();
});

test("dashboard and evidence come from authenticated API", async ({ page }) => {
  await login(page);
  const metrics = page.getByRole("region", { name: "Ключевые показатели" });
  await expect(
    metrics.getByText("Объектов в реестре", { exact: true }),
  ).toBeVisible();
  await expect(metrics.getByText("Сигналов", { exact: true })).toBeVisible();
  await expect(
    metrics.getByText("Ожидают проверки", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Распределение по риску" }),
  ).toBeVisible();
  await expect(
    page.getByText("Недостаточно данных", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "DEMO Бәйтерек · очередь 2", exact: true }),
  ).toBeVisible();
  await mkdir("../output/qa", { recursive: true });
  await page.screenshot({ path: "../output/qa/dashboard.png", fullPage: true });
  await page.getByLabel("Найти объект или адрес").fill("Бәйтерек");
  await page.getByRole("button", { name: "Найти объект", exact: true }).click();
  await expect(page).toHaveURL(/\/properties\?q=/);
  await expect(page.getByLabel("Поиск ЖК или адреса")).toHaveValue("Бәйтерек");
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

test("dashboard keeps its information hierarchy at target widths", async ({
  page,
}) => {
  await login(page);
  await mkdir("../output/qa", { recursive: true });
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Распределение по риску" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Требует действий" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "DEMO Бәйтерек · очередь 2",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `../output/qa/dashboard-${width}.png`,
      fullPage: true,
    });
  }
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

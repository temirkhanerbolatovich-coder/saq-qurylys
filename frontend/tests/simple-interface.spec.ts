import { expect, test } from "@playwright/test";
import { login } from "./support";
import { comparePropertyWork } from "../lib/property-priority";
import type { Page as ResultPage, Property } from "../lib/types";

test("workspace has five permanent destinations and uses real scores at all screen widths", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const registry: ResultPage<Property> = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const rows = [...registry.items].sort(comparePropertyWork).slice(0, 3);
  const nav = page.getByRole("navigation", { name: "Основная навигация" });
  await expect(nav.getByRole("link")).toHaveCount(5);
  const accountContrast = await page
    .locator(".user strong")
    .evaluate((element) => {
      function luminance(color: string) {
        const [r, g, b] = (color.match(/[\d.]+/g) || [])
          .slice(0, 3)
          .map((value) => {
            const c = Number(value) / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
        return r * 0.2126 + g * 0.7152 + b * 0.0722;
      }
      const foreground = luminance(getComputedStyle(element).color);
      const background = luminance(
        getComputedStyle(element.closest(".sidebar")!).backgroundColor,
      );
      return (
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05)
      );
    });
  expect(accountContrast).toBeGreaterThanOrEqual(4.5);
  await expect(page.locator(".metrics")).toHaveCount(0);
  await expect(page.locator(".property-card")).toHaveCount(rows.length);
  for (const [index, row] of rows.entries()) {
    const card = page.locator(".property-card").nth(index);
    await expect(card.getByRole("heading")).toHaveText(row.name);
    await expect(card.locator(".zone strong")).toHaveText(
      String(row.risk.score),
    );
  }
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await expect(
      page.getByRole("button", { name: "Выйти", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `../output/simple-interface/home-${width}.png`,
      fullPage: true,
    });
  }
});

test("catalog search, dossier and context return work without expert controls", async ({
  page,
}) => {
  await login(page, { detailed: false });
  await page.getByRole("link", { name: "Найти объект", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Карта и список", exact: true }),
  ).toBeHidden();
  await expect(page.getByLabel("Фильтр по основанию")).toBeHidden();
  await page.getByLabel("Поиск ЖК или адреса").fill("Бәйтерек");
  await expect(page.locator(".property-card")).toHaveCount(1);
  const name = await page.locator(".property-card h2").innerText();
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page
    .getByRole("tab", { name: "Проверка и риски", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Материалы и проверки", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Доказательства", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Доказательства", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("DEMO заключение:", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "К реестру", exact: true }).click();
  await expect(page.getByLabel("Поиск ЖК или адреса")).toHaveValue("Бәйтерек");
  await page.reload();
  await expect(page.locator(".property-card")).toHaveCount(1);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/simple-interface/catalog-${width}.png`,
      fullPage: true,
    });
  }
});

test("mode switching preserves form input and is retained after reload", async ({
  page,
}) => {
  await login(page, { detailed: false });
  await page
    .getByRole("link", { name: "Добавить публикацию", exact: true })
    .click();
  await page
    .getByLabel("Источник / описание происхождения", { exact: true })
    .fill("DEMO новый простой интерфейс");
  await page
    .getByLabel("Оригинальный текст", { exact: true })
    .fill("DEMO Өскемен, проверка сохранности черновика");
  await expect(
    page.getByLabel("Дата публикации", { exact: false }),
  ).toBeHidden();
  await page
    .getByText("Ссылка и дата публикации · необязательно", { exact: true })
    .click();
  await page
    .getByLabel("Дата публикации", { exact: false })
    .fill("2026-10-16T10:00");
  await page
    .getByRole("button", { name: "Подробный вид", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Основная навигация" })
      .getByRole("link"),
  ).toHaveCount(5);
  await expect(
    page.getByLabel("Оригинальный текст", { exact: true }),
  ).toHaveValue("DEMO Өскемен, проверка сохранности черновика");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Краткий вид", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Краткий вид", exact: true }).click();
  await page
    .getByText("Ссылка и дата публикации · необязательно", { exact: true })
    .click();
  await expect(
    page.getByLabel("Дата публикации", { exact: false }),
  ).toHaveValue("2026-10-16T10:00");
  await expect(
    page.getByRole("checkbox", { name: "Демонстрационный материал (DEMO)" }),
  ).toBeChecked();
});

test("simple material submission reaches review without an automatic analysis", async ({
  page,
}) => {
  await login(page, { detailed: false });
  await page
    .getByRole("link", { name: "Добавить публикацию", exact: true })
    .click();
  const source = `DEMO simple flow ${Date.now()}`;
  await page
    .getByLabel("Источник / описание происхождения", { exact: true })
    .fill(source);
  await page
    .getByLabel("Оригинальный текст", { exact: true })
    .fill("DEMO учебный материал без предложения оплаты.");
  let analyses = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/analyze"))
      analyses++;
  });
  await page
    .getByRole("button", { name: "Сохранить публикацию", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Перейти к проверке", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Запустить анализ", exact: true }),
  ).toBeVisible();
  expect(analyses).toBe(0);
});

test("simple dossier keeps expert drafts and file selection across mode changes", async ({
  page,
}) => {
  await login(page, { detailed: false });
  await page.goto("/properties");
  await expect(page.locator(".property-card")).toHaveCount(8);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Перейти к содержимому", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page
    .getByRole("link", { name: "DEMO Бәйтерек · очередь 2", exact: true })
    .click();
  await page
    .getByRole("tab", { name: "Проверка и риски", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Открыть инструменты", exact: true })
    .click();
  const reason = page.getByLabel("Обоснование решения R1", { exact: true });
  await reason.fill("DEMO Өскемен: незавершённое обоснование");
  await page.getByRole("button", { name: "Краткий вид", exact: true }).click();
  await expect(reason).toBeHidden();
  await page
    .getByRole("button", { name: "Открыть инструменты", exact: true })
    .click();
  await expect(reason).toHaveValue("DEMO Өскемен: незавершённое обоснование");
  await page.getByRole("button", { name: "Краткий вид", exact: true }).click();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/simple-interface/dossier-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto("/advertisements/upload");
  await page.locator('input[type="file"]').setInputFiles({
    name: "DEMO-Өскемен.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("DEMO учебный материал"),
  });
  await page
    .getByRole("button", { name: "Подробный вид", exact: true })
    .click();
  await page.getByRole("button", { name: "Краткий вид", exact: true }).click();
  expect(
    await page
      .locator('input[type="file"]')
      .evaluate((input) => (input as HTMLInputElement).files?.[0].name),
  ).toBe("DEMO-Өскемен.txt");
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/simple-interface/upload-${width}.png`,
      fullPage: true,
    });
  }
});

test("simple home explains request failure and keeps viewer actions read-only", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const current = await (await page.request.get("/api/v1/auth/me")).json();
  // Presentation only; authorization is still enforced by the unchanged API.
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...current, role: "viewer" } }),
  );
  await page.route("**/api/v1/properties?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "DEMO проверка недоступности каталога" } },
    }),
  );
  await page.reload();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "DEMO проверка недоступности каталога" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Добавить публикацию", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Открыть публикации", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".user").getByText("Просмотр", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/v1/properties?*");
  await page
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(page.locator(".property-card")).toHaveCount(3);
});

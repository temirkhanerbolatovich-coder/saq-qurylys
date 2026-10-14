import { test, expect } from "@playwright/test";
import { login } from "./support";

test("human decisions turn a payment hypothesis into R2 and can remove the score", async ({
  page,
}) => {
  await login(page);
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const saved = await page.request.post("/api/v1/advertisements", {
    headers: {
      Origin: "http://localhost:3000",
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {
      text: "ЖК «Ертіс», очередь 1.\nПервоначальный взнос 20%. Строящийся дом.",
      source_label: `DEMO review browser ${Date.now()}`,
      is_demo: true,
    },
  });
  expect(saved.status()).toBe(201);
  const ad = await saved.json();
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const property = registry.items.find((p: { name: string }) =>
    p.name.includes("Ертіс"),
  );
  await page.goto(`/review?advertisement_id=${ad.id}`);
  await page
    .getByRole("button", { name: "Запустить анализ", exact: true })
    .click();
  const payment = page
    .locator(".hypothesis")
    .filter({ hasText: "Условие оплаты" })
    .first();
  await expect(payment).toBeVisible({ timeout: 30000 });
  await expect(payment).toContainText("PENDING");
  await payment.getByRole("button", { name: /показать в оригинале/ }).click();
  await expect(page.locator("mark")).toContainText("Первоначальный взнос 20%");
  await payment
    .getByLabel("Обоснование проверки")
    .fill("Сверено с оригинальным текстом");
  await payment
    .getByRole("button", { name: "Подтвердить гипотезу", exact: true })
    .click();
  await expect(payment).toContainText("CONFIRMED");
  await page
    .getByLabel("ЖК / очередь · можно выбрать вручную")
    .selectOption(property.id);
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("DEMO: проверены название, очередь и адрес");
  await page
    .getByRole("button", { name: "Подтвердить привязку", exact: true })
    .click();
  await expect(
    page.getByText("Подтверждён объект:", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Проверенное условие оплаты")
    .selectOption({ index: 1 });
  await page
    .getByLabel("Обоснование решения по R2")
    .fill("Прямое предложение первоначального взноса, сверено с оригиналом");
  await page
    .getByRole("button", { name: "Сохранить доказательство R2", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Доказательство сохранено",
  );
  const riskPanel = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "R2 · прямое предложение платежа",
      exact: true,
    }),
  });
  await page
    .getByRole("button", { name: "Подтвердить R2 · +25", exact: true })
    .click();
  await expect(riskPanel.locator(".zone strong")).toHaveText("25");
  const persisted = await (
    await page.request.get(`/api/v1/properties/${property.id}/risk`)
  ).json();
  expect(persisted.summary.confirmed_codes).toContain("R2");
  await page.getByRole("button", { name: "Отклонить R2", exact: true }).click();
  await expect(riskPanel.locator(".zone strong")).toHaveText("0");
  await page.getByText("Журнал решений по объекту", { exact: true }).click();
  await expect(
    page.getByText("RISK_FACTOR_REVIEWED", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({ path: "../output/qa/review-r2.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("PNG goes through real worker OCR and shows a pixel fragment", async ({
  page,
}) => {
  await login(page);
  await page.goto("/advertisements/upload");
  await page
    .getByLabel("Источник / происхождение")
    .fill(`DEMO browser OCR ${Date.now()}`);
  await page
    .getByLabel("Оригинальный PNG / JPEG")
    .setInputFiles("../output/qa/ocr-kz.png");
  await page
    .getByRole("button", { name: "Сохранить изображение", exact: true })
    .click();
  await expect(page).toHaveURL(/\/review\?advertisement_id=/);
  await page
    .getByRole("button", { name: "Запустить анализ", exact: true })
    .click();
  await expect(
    page.locator(".hypothesis").filter({ hasText: "Условие оплаты" }),
  ).toHaveCount(2, { timeout: 30000 });
  await page
    .locator(".hypothesis")
    .filter({ hasText: "Условие оплаты" })
    .first()
    .getByRole("button", { name: /показать в оригинале/ })
    .click();
  await expect(
    page.getByRole("img", { name: "Оригинал рекламного материала" }),
  ).toBeVisible();
  await expect(
    page.locator('svg[aria-label="Выделенный фрагмент OCR"] rect'),
  ).toBeVisible();
  await expect(page.locator("mark")).toContainText("жарна 20%");
  await expect(
    page.getByText("Есть возможная потеря казахской диакритики", {
      exact: false,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "../output/qa/review-ocr.png",
    fullPage: true,
  });
});

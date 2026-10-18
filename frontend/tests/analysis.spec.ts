import { test, expect } from "@playwright/test";
import { login, openDossierTools, testOrigin } from "./support";

test("appeal document requires a separate R4 decision", async ({ page }) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const id = registry.items.find((p: { name: string }) =>
    p.name.includes("Самал"),
  ).id;
  // Samal has other confirmed factors: uploading R4 must preserve that baseline.
  const risk = async () =>
    (await (await page.request.get(`/api/v1/properties/${id}/risk`)).json())
      .summary;
  const before = await risk();
  const withoutR4 =
    before.score - (before.confirmed_codes.includes("R4") ? 15 : 0);
  expect(withoutR4).toBeGreaterThan(0);
  await page.goto(`/properties/${id}`);
  await openDossierTools(page);
  await page.getByLabel("Источник обращения").fill("DEMO browser appeal");
  await page.getByLabel("Документ обращения · TXT / PNG / JPEG").setInputFiles({
    name: "appeal.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "DEMO: коллективное обращение двух вымышленных заявителей",
    ),
  });
  await page.getByLabel("Дата обращения · +05:00").fill("2026-10-13T12:00");
  await page.getByLabel("Количество заявителей").fill("2");
  await page
    .getByLabel("Основание проверки коллективности")
    .fill("Сверены два заявителя в синтетическом документе");
  await page
    .getByLabel("Обоснование решения R4")
    .fill("Учебная ручная проверка");
  await page
    .getByRole("button", { name: "Сохранить документ обращения", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Документ и доказательство сохранены" }),
  ).toContainText("Документ и доказательство сохранены");
  const afterUpload = await risk();
  expect(afterUpload.score).toBe(before.score);
  expect(afterUpload.zone).toBe(before.zone);
  expect(afterUpload.confirmed_codes).toEqual(before.confirmed_codes);
  await page
    .getByRole("button", { name: "Подтвердить R4 · +15", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "R4 подтверждён" }),
  ).toHaveText("R4 подтверждён: +15 баллов.");
  expect((await risk()).score).toBe(withoutR4 + 15);
  expect((await risk()).confirmed_codes).toContain("R4");
  await page
    .locator(".factor-row")
    .filter({ hasText: "Коллективное обращение" })
    .getByRole("button", { name: "Доказательства", exact: true })
    .click();
  await expect(page.getByText("Заявителей: 2", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Отклонить R4", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "R4 отклонён" }),
  ).toHaveText("R4 отклонён: 0 баллов.");
  expect((await risk()).score).toBe(withoutR4);
  expect((await risk()).confirmed_codes).toEqual(
    before.confirmed_codes.filter((code: string) => code !== "R4"),
  );
});

test("UTF-8 TXT upload keeps the original and creates payment hypotheses", async ({
  page,
}) => {
  await login(page);
  await page.goto("/advertisements/upload");
  const text = "ЖК «Арман»\r\nБастапқы жарна 20%.\r\n";
  await page
    .getByLabel("Источник / происхождение")
    .fill(`DEMO TXT ${Date.now()}`);
  await page.getByLabel("Оригинальный PNG / JPEG / TXT").setInputFiles({
    name: "new.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(text, "utf8"),
  });
  await page
    .getByRole("button", { name: "Сохранить файл", exact: true })
    .click();
  await expect(page).toHaveURL(/\/review\?advertisement_id=/);
  const id = new URL(page.url()).searchParams.get("advertisement_id");
  const ad = await (
    await page.request.get(`/api/v1/advertisements/${id}`)
  ).json();
  expect(ad.original_text).toBe(text);
  expect(
    await (await page.request.get(`/api/v1/assets/${ad.assets[0].id}`)).text(),
  ).toBe(text);
  await page
    .getByRole("button", { name: "Запустить анализ", exact: true })
    .click();
  await expect(
    page.locator(".hypothesis").filter({ hasText: "Условие оплаты" }),
  ).toHaveCount(1, { timeout: 30000 });
});

test("unknown stage and R5 display their own labels", async ({ page }) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const id = registry.items.find((p: { name: string }) =>
    p.name.includes("Өркен"),
  ).id;
  // Presentation regression only; no domain data or factor decisions are changed.
  await page.route(`**/api/v1/properties/${id}`, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.property.stage = "UNKNOWN";
    body.factors[0].code = "R5";
    await route.fulfill({ response, json: body });
  });
  await page.goto(`/properties/${id}`);
  await openDossierTools(page);
  await expect(
    page.locator("dt").filter({ hasText: "Стадия" }).locator("+ dd"),
  ).toHaveText("Не проверена");
  await expect(
    page.getByText("Расхождение готовности ≥20 п.п.", { exact: true }),
  ).toBeVisible();
});

test("human decisions turn a payment hypothesis into R2 and can remove the score", async ({
  page,
}) => {
  await login(page);
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const saved = await page.request.post("/api/v1/advertisements", {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {
      text: "ЖК «Ертіс», очередь 1.\nПеречислите 500 000 тенге для закрепления квартиры за вами. Строящийся дом.",
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
  await expect(payment.locator(".status")).toHaveText("На проверке");
  await payment.getByRole("button", { name: /показать в оригинале/ }).click();
  await expect(page.locator("mark")).toContainText(
    "Перечислите 500 000 тенге для закрепления квартиры за вами",
  );
  await payment
    .getByLabel("Обоснование проверки")
    .fill("Сверено с оригинальным текстом");
  await payment
    .getByRole("button", { name: "Подтвердить гипотезу", exact: true })
    .click();
  await expect(payment.locator(".status")).toHaveText("Подтверждено");
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
    .fill("Прямое предложение перевода денег, сверено с оригиналом");
  await page
    .getByRole("button", { name: "Сохранить доказательство R2", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Доказательство сохранено" }),
  ).toContainText("Доказательство сохранено");
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
    page
      .getByRole("heading", { name: "Проверен фактор риска", exact: true })
      .first(),
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
    .getByLabel("Оригинальный PNG / JPEG / TXT")
    .setInputFiles("../output/qa/ocr-kz.png");
  await page
    .getByRole("button", { name: "Сохранить файл", exact: true })
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

test("payment evidence waits for the current property factor before saving", async ({
  page,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const property = registry.items.find((row: { name: string }) =>
    row.name.includes("Самал"),
  );
  const initial = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  const existingFactor = initial.factors.find(
    (factor: { code: string }) => factor.code === "R2",
  );
  expect(existingFactor).toBeDefined();
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const saved = await page.request.post("/api/v1/advertisements", {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {
      text: "ЖК «Самал», очередь 1. Первоначальный взнос 20%. Строящийся дом.",
      source_label: `DEMO R2 loading regression ${Date.now()}`,
      is_demo: true,
    },
  });
  expect(saved.status()).toBe(201);
  const ad = await saved.json();
  await page.goto(`/review?advertisement_id=${ad.id}`);
  await page
    .getByRole("button", { name: "Запустить анализ", exact: true })
    .click();
  const payment = page
    .locator(".hypothesis")
    .filter({ hasText: "Условие оплаты" })
    .first();
  await expect(payment).toBeVisible({ timeout: 30000 });
  await payment
    .getByLabel("Обоснование проверки")
    .fill("DEMO: условие сверено с оригиналом");
  await payment
    .getByRole("button", { name: "Подтвердить гипотезу", exact: true })
    .click();
  await expect(payment.locator(".status")).toHaveText("Подтверждено");

  let releaseResponse!: () => void;
  const held = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  let requestStarted!: () => void;
  const loading = new Promise<void>((resolve) => {
    requestStarted = resolve;
  });
  await page.route(`**/api/v1/properties/${property.id}`, async (route) => {
    const response = await route.fetch();
    requestStarted();
    await held;
    await route.fulfill({ response });
  });
  let createFactorRequests = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname ===
        `/api/v1/properties/${property.id}/risk-factors`
    )
      createFactorRequests += 1;
  });
  await page
    .getByLabel("ЖК / очередь · можно выбрать вручную")
    .selectOption(property.id);
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("DEMO: Самал, очередь 1, адрес проверен");
  await page
    .getByRole("button", { name: "Подтвердить привязку", exact: true })
    .click();
  await loading;
  const panel = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "R2 · прямое предложение платежа",
      exact: true,
    }),
  });
  await panel
    .getByLabel("Проверенное условие оплаты")
    .selectOption({ index: 1 });
  await panel
    .getByLabel("Обоснование решения по R2")
    .fill("DEMO: новое доказательство для существующего R2");
  const save = panel.getByRole("button", {
    name: "Сохранить доказательство R2",
    exact: true,
  });
  await expect(panel.getByRole("status")).toContainText(
    "Загружаем текущий фактор R2",
  );
  await expect(save).toBeDisabled();
  releaseResponse();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(panel.getByRole("status")).toContainText(
    "Доказательство сохранено",
  );
  expect(createFactorRequests).toBe(0);
  const after = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  expect(
    after.factors.find((factor: { code: string }) => factor.code === "R2").id,
  ).toBe(existingFactor.id);
  expect(after.property.risk.score).toBe(initial.property.risk.score);
});

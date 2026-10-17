import { test, expect } from "@playwright/test";
import { login } from "./support";

test("R5 keeps partial uploads and compares fractional percentage points exactly", async ({
  page,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const id = registry.items.find((property: { name: string }) =>
    property.name.includes("Ертіс"),
  ).id;
  await page.goto(`/properties/${id}`);
  const panel = page.getByTestId("construction-R5");
  await panel.getByText("R5 · сравнение готовности", { exact: true }).click();
  const suffix = Date.now();
  await panel
    .getByLabel("Область сравнения: очередь / корпус / метод")
    .fill(`DEMO Ертіс очередь 1, строительная готовность ${suffix}`);
  await panel
    .getByLabel("Заявленная готовность · TXT / PNG / JPEG")
    .setInputFiles({
      name: "declared.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        `DEMO ${suffix}: заявленная готовность очереди 1 на 13 октября — 80,1%.`,
      ),
    });
  await panel
    .getByLabel("Источник · Заявленная готовность", { exact: true })
    .fill("DEMO отчёт застройщика");
  await panel
    .getByLabel("Заявленная готовность · %", { exact: true })
    .fill("80.1");
  await panel
    .getByLabel("Проверенная готовность · TXT / PNG / JPEG")
    .setInputFiles({
      name: "verified.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        `DEMO ${suffix}: независимое измерение очереди 1 на 13 октября — 60,1%.`,
      ),
    });
  await panel
    .getByLabel("Источник · Проверенная готовность", { exact: true })
    .fill("DEMO акт независимого осмотра");
  await panel
    .getByLabel("Проверенная готовность · %", { exact: true })
    .fill("60.1");
  await panel
    .getByLabel("Общая дата сопоставимых измерений · R5 · +05:00")
    .fill("2026-10-13T12:00");
  await panel
    .getByLabel("Методика проверки источников · R5")
    .fill(
      "Один корпус, одинаковый состав работ и веса; сверены два датированных оригинала",
    );
  await panel
    .getByLabel("Обоснование решения R5")
    .fill(
      "DEMO: сопоставимые измерения 80,1 и 60,1 процента, расхождение 20 п.п.",
    );
  let evidenceRequests = 0;
  let uploadRequests = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/v1/assets/upload"
    )
      uploadRequests += 1;
  });
  await page.route("**/api/v1/evidence", async (route) => {
    evidenceRequests += 1;
    if (evidenceRequests === 2) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        json: {
          error: {
            code: "TEMPORARY_FAILURE",
            message: "Тестовый временный сбой после загрузки второго документа",
          },
        },
      });
    } else await route.continue();
  });
  await panel
    .getByRole("button", { name: "Сохранить сравнение R5", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("HTTP 503");
  expect(uploadRequests).toBe(2);
  await panel
    .getByRole("button", { name: "Сохранить сравнение R5", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Материалы R5 сохранены",
  );
  expect(uploadRequests).toBe(2);
  const risk = async () =>
    (await (await page.request.get(`/api/v1/properties/${id}/risk`)).json())
      .summary;
  expect((await risk()).confirmed_codes).not.toContain("R5");
  const before = (await risk()).score;
  expect(before).toBe(0);
  await panel
    .getByRole("button", { name: "Подтвердить R5 · +10", exact: true })
    .click();
  await expect(panel.getByRole("status")).toHaveText(
    "R5 подтверждён: +10 баллов.",
  );
  expect((await risk()).score).toBe(before + 10);
  await page.reload();
  await panel.getByText("R5 · сравнение готовности", { exact: true }).click();
  await expect(panel).toContainText("Подтверждён");
  await panel
    .getByLabel("Обоснование решения R5")
    .fill("DEMO повторная проверка: отклонить фактор и сохранить историю");
  await panel
    .getByRole("button", { name: "Отклонить R5", exact: true })
    .click();
  await expect(panel.getByRole("status")).toHaveText("R5 отклонён: 0 баллов.");
  expect((await risk()).score).toBe(before);
  const events = await (
    await page.request.get(`/api/v1/properties/${id}/audit?page_size=100`)
  ).json();
  expect(
    events.items.filter(
      (event: { action: string }) => event.action === "RISK_FACTOR_REVIEWED",
    ).length,
  ).toBeGreaterThanOrEqual(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../output/qa/construction-r5.png",
    fullPage: true,
  });
});

test("R6 stores dated delay evidence before human confirmation and rejection", async ({
  page,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const id = registry.items.find((property: { name: string }) =>
    property.name.includes("Ертіс"),
  ).id;
  await page.goto(`/properties/${id}`);
  const panel = page.getByTestId("construction-R6");
  await panel
    .getByText("R6 · документированная просрочка", { exact: true })
    .click();
  await panel.getByLabel("Документ о сроках · TXT / PNG / JPEG").setInputFiles({
    name: "delay.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      `DEMO ${Date.now()}: план 1 октября; на 13 октября работы очереди 1 не завершены.`,
    ),
  });
  await panel
    .getByLabel("Источник · Документ о сроках", { exact: true })
    .fill("DEMO акт осмотра с плановым сроком");
  await panel
    .getByLabel("Плановый срок завершения · +05:00")
    .fill("2026-10-01T18:00");
  await panel
    .getByLabel("Дата состояния по источнику · R6 · +05:00")
    .fill("2026-10-13T12:00");
  await panel
    .getByLabel("Методика и обоснование существенности отклонения · R6")
    .fill(
      "Сверены плановый срок и фактическое незавершение. DEMO: отсутствие завершения ключевых работ существенно для учебного сценария; нормативный порог не заявляется.",
    );
  await panel
    .getByLabel("Обоснование решения R6")
    .fill("Ручная DEMO проверка датированного документа о просрочке очереди 1");
  await panel
    .getByRole("button", { name: "Сохранить документ R6", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Материалы R6 сохранены",
  );
  const risk = async () =>
    (await (await page.request.get(`/api/v1/properties/${id}/risk`)).json())
      .summary;
  const before = (await risk()).score;
  expect((await risk()).confirmed_codes).not.toContain("R6");
  await panel
    .getByRole("button", { name: "Подтвердить R6 · +5", exact: true })
    .click();
  await expect(panel.getByRole("status")).toHaveText(
    "R6 подтверждён: +5 баллов.",
  );
  await expect(panel).toContainText("Текущий статус R6: Подтверждён");
  expect((await risk()).score).toBe(before + 5);
  await panel
    .getByRole("button", { name: "Отклонить R6", exact: true })
    .click();
  await expect(panel.getByRole("status")).toHaveText("R6 отклонён: 0 баллов.");
  expect((await risk()).score).toBe(before);
});

test("R3 joins a dated publication and an independent construction document before a separate decision", async ({
  page,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const property = registry.items.find((row: { name: string }) =>
    row.name.includes("Ертіс"),
  );
  const initialDetail = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  const initialFactor = initialDetail.factors.find(
    (row: { code: string }) => row.code === "R3",
  );
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const label = `DEMO R3 publication ${Date.now()}`;
  const response = await page.request.post("/api/v1/advertisements", {
    headers: {
      Origin: "http://localhost:3000",
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {
      text: "ЖК «Ертіс», очередь 1. Продажа квартир. Строящийся дом.",
      source_label: label,
      published_at: "2026-10-13T09:00:00+05:00",
      is_demo: true,
    },
  });
  expect(response.status()).toBe(201);
  const ad = await response.json();
  await page.goto(`/review?advertisement_id=${ad.id}`);
  await page
    .getByRole("button", { name: "Запустить анализ", exact: true })
    .click();
  await expect(page.locator(".hypothesis").first()).toBeVisible({
    timeout: 30000,
  });
  await page
    .getByLabel("ЖК / очередь · можно выбрать вручную")
    .selectOption(property.id);
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("DEMO R3: сверены название Ертіс, очередь 1 и адрес");
  await page
    .getByRole("button", { name: "Подтвердить привязку", exact: true })
    .click();
  await expect(
    page.getByText("Подтверждён объект:", { exact: false }),
  ).toBeVisible();

  await page.goto(`/properties/${property.id}`);
  const panel = page.getByTestId("construction-R3");
  await panel.getByText("R3 · реклама до ввода", { exact: true }).click();
  await panel.getByLabel("Публикация для R3").selectOption(ad.id);
  await panel.getByLabel("Документ о стадии · TXT / PNG / JPEG").setInputFiles({
    name: "construction-stage.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      `DEMO независимый акт ${Date.now()}: на 13 октября 2026 года очередь 1 Ертіс строится и не введена.`,
    ),
  });
  await panel
    .getByLabel("Источник · Документ о стадии", { exact: true })
    .fill("DEMO независимый датированный акт осмотра очереди 1");
  await panel
    .getByLabel("Дата состояния по источнику · R3 · +05:00")
    .fill("2026-10-13T12:00");
  await panel
    .getByLabel("Методика проверки источников · R3")
    .fill(
      "Сверены отдельный акт о незавершённой стадии, конкретная очередь и дата рекламной публикации в +05:00",
    );
  await panel
    .getByLabel("Обоснование решения R3")
    .fill(
      "DEMO: реклама и независимое подтверждение строительства относятся к одной очереди и одному дню",
    );
  await panel
    .getByRole("button", { name: "Сохранить материалы R3", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Материалы R3 сохранены",
  );
  const risk = async () =>
    (
      await (
        await page.request.get(`/api/v1/properties/${property.id}/risk`)
      ).json()
    ).summary;
  const before = (await risk()).score;
  expect(before).toBe(0);
  expect((await risk()).confirmed_codes).not.toContain("R3");
  const pending = await (
    await page.request.get(`/api/v1/properties/${property.id}`)
  ).json();
  const factor = pending.factors.find(
    (row: { code: string }) => row.code === "R3",
  );
  // A fresh factor is pending. Repeated runs preserve the previous rejection until review.
  expect(factor.status).toBe(initialFactor ? initialFactor.status : "PENDING");
  if (!initialFactor) expect(factor.evidence_ids).toHaveLength(2);
  await panel
    .getByRole("button", { name: "Подтвердить R3 · +10", exact: true })
    .click();
  await expect(panel.getByRole("status")).toHaveText(
    "R3 подтверждён: +10 баллов.",
  );
  await expect(panel).toContainText("Текущий статус R3: Подтверждён");
  expect((await risk()).score).toBe(before + 10);
  await panel
    .getByRole("button", { name: "Отклонить R3", exact: true })
    .click();
  await expect(panel.getByRole("status")).toHaveText("R3 отклонён: 0 баллов.");
  expect((await risk()).score).toBe(before);
});

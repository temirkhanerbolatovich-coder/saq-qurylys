import { expect, test, type Page as BrowserPage } from "@playwright/test";
import type { Advertisement, Extraction, Page, Property } from "../lib/types";
import { login, testOrigin } from "./support";

const fixtureId = (index: number) =>
  `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;

function material(index: number): Advertisement {
  return {
    id: fixtureId(index),
    revision: 1,
    latest_job_id: null,
    source_label: `DEMO presentation material ${index + 1}`,
    source_url: `https://example.invalid/demo/${index + 1}`,
    original_text: `DEMO original ${index + 1}. Первоначальный взнос 20%.`,
    published_at: null,
    captured_at: "2026-10-17T05:15:00Z",
    status: "READY_FOR_REVIEW",
    assets: [],
    is_demo: true,
    confirmed_property_id: null,
  };
}

function extraction(ad: Advertisement): Extraction {
  return {
    id: `extraction-${ad.id}`,
    revision: 1,
    parent_extraction_id: null,
    pipeline_version: "DEMO presentation fixture",
    original_ocr_text: null,
    analysis_text: ad.original_text,
    created_at: ad.captured_at,
    warnings: [],
    hypotheses: [
      {
        id: `hypothesis-${ad.id}`,
        field: "PAYMENT_TERM",
        value: { text: "Первоначальный взнос 20%", money: null, percent: 20 },
        reviewed_value: null,
        review_status: "PENDING",
        fragment: {
          asset_id: fixtureId(999),
          text_version_id: fixtureId(998),
          quote: "Первоначальный взнос 20%",
          start_offset: 17,
          end_offset: 42,
          bbox: null,
        },
      },
    ],
  };
}

// Bounded API presentation fixtures prove queue/URL/rendering behavior beyond 100;
// they do not claim a real large-dataset or domain acceptance run.
async function mockMaterials(page: BrowserPage, count = 121) {
  const materials = Array.from({ length: count }, (_, index) =>
    material(index),
  );
  await page.route("**/api/v1/advertisements**", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/advertisements") {
      const status = url.searchParams.get("status");
      const filtered = materials.filter(
        (ad) => !status || status === ad.status,
      );
      const currentPage = Number(url.searchParams.get("page") || 1);
      const size = Number(url.searchParams.get("page_size") || 20);
      return route.fulfill({
        json: {
          items: filtered.slice((currentPage - 1) * size, currentPage * size),
          total: filtered.length,
          page: currentPage,
          page_size: size,
        },
      });
    }
    const [, id, subresource] =
      url.pathname.match(/\/advertisements\/([^/]+)(?:\/(.*))?$/) || [];
    const ad = materials.find((row) => row.id === id);
    if (!ad) return route.fallback();
    return route.fulfill({
      json:
        subresource === "extractions"
          ? [extraction(ad)]
          : subresource === "matches"
            ? []
            : ad,
    });
  });
  return materials;
}

async function choose(page: BrowserPage, source: string) {
  const panel = page.locator(".review-queue > details");
  if ((await panel.getAttribute("open")) === null)
    await panel.locator(":scope > summary").click();
  const details = page.locator(".review-queue-materials");
  if ((await details.getAttribute("open")) === null)
    await details.locator("summary").click();
  await page.locator(".review-queue-item").filter({ hasText: source }).click();
}

test("server-paged review queue reaches material 101 and preserves selection, filters, Back and reload", async ({
  page,
}) => {
  await login(page);
  const materials = await mockMaterials(page);
  let commands = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") commands += 1;
  });
  await page.goto("/review?page=3&page_size=50");
  await expect(
    page.getByRole("navigation", { name: "Страницы очереди проверки" }),
  ).toContainText("Страница 3 из 3");
  await expect(page.locator(".review-queue-item")).toHaveCount(21);
  await choose(page, materials[100].source_label);
  await expect(page.locator(".review-queue > details")).not.toHaveAttribute(
    "open",
  );
  await expect(page).toHaveURL(
    new RegExp(`advertisement_id=${materials[100].id}`),
  );
  await expect(page.locator(".review-provenance")).toContainText(
    materials[100].source_label,
  );
  await expect(
    page.locator(".review-provenance").getByRole("link"),
  ).toHaveAttribute("href", materials[100].source_url!);
  await expect(page.locator(".review-provenance")).toContainText(
    "Дата публикации неизвестна",
  );
  await expect(page.locator(".review-provenance")).toContainText("10:15");
  await page
    .getByText("Сменить материал · очередь и фильтры", { exact: true })
    .click();
  await page
    .getByLabel("Состояние материала", { exact: true })
    .selectOption("FAILED");
  await expect(page).toHaveURL(/status=FAILED/);
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  await expect(
    page.getByText("Выбранный материал открыт по прямой ссылке", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator(".review-provenance")).toContainText(
    materials[100].source_label,
  );
  await page.goBack();
  await expect(page.getByLabel("Материалов на странице")).toHaveValue("50");
  await expect(
    page.getByLabel("Состояние материала", { exact: true }),
  ).toHaveValue("");
  await page.reload();
  await expect(page.locator(".review-provenance")).toContainText(
    materials[100].source_label,
  );
  expect(commands).toBe(0);
});

async function createMaterial(page: BrowserPage, source: string) {
  const csrf = await (await page.request.get("/api/v1/auth/csrf")).json();
  const response = await page.request.post("/api/v1/advertisements", {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf.csrf_token,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: {
      text: "ЖК «Ертіс», очередь 1. Первоначальный взнос 20%. Строящийся дом.",
      source_label: source,
      is_demo: true,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as Advertisement;
}

test("real review drafts retain match, hypothesis, R2 and transcription input across A to B to A, Back and reload", async ({
  page,
}) => {
  await login(page);
  const a = await createMaterial(page, `DEMO draft A ${Date.now()}`);
  const b = await createMaterial(page, `DEMO draft B ${Date.now()}`);
  await page.goto(`/review?advertisement_id=${a.id}`);
  await page
    .getByRole("button", { name: "Запустить анализ", exact: true })
    .click();
  const hypothesis = page
    .locator(".hypothesis")
    .filter({ hasText: "Условие оплаты" })
    .first();
  await expect(hypothesis).toBeVisible({ timeout: 30000 });
  await hypothesis
    .getByLabel("Обоснование проверки")
    .fill("DEMO: сверено с оригиналом");
  await hypothesis
    .getByRole("button", { name: "Подтвердить гипотезу", exact: true })
    .click();
  await expect(hypothesis.locator(".status")).toHaveText("Подтверждено");
  const registry: Page<Property> = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const property = registry.items.find((row) => row.name.includes("Ертіс"))!;
  await page
    .getByLabel("ЖК / очередь · можно выбрать вручную")
    .selectOption(property.id);
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("DEMO: сверены ЖК и очередь");
  await page
    .getByRole("button", { name: "Подтвердить привязку", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "R2 · прямое предложение платежа",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Проверенное условие оплаты")
    .selectOption({ index: 1 });
  await page
    .getByLabel("Обоснование решения по R2")
    .fill("Черновик причины отдельного решения R2");
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("Несохранённая причина привязки A");
  await hypothesis
    .getByLabel("Обоснование проверки")
    .fill("Черновик решения гипотезы A");
  await hypothesis
    .getByRole("button", { name: "Исправить", exact: true })
    .click();
  await hypothesis
    .getByLabel("Исправленный текст")
    .fill("Черновик исправленного условия");
  await page
    .getByRole("button", { name: "Исправить расшифровку", exact: true })
    .click();
  await page
    .getByLabel("Новая расшифровка по оригиналу")
    .fill("DEMO: редактируемая расшифровка A");
  await page
    .getByLabel("Причина исправления", { exact: true })
    .fill("Сверяю буквы по оригиналу");
  let commands = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") commands += 1;
  });
  await choose(page, b.source_label);
  await expect(page).toHaveURL(new RegExp(b.id));
  await expect(page.locator(".review-provenance")).toContainText(
    b.source_label,
  );
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(a.id));
  await expect(page.getByLabel("Обоснование выбора / отклонения")).toHaveValue(
    "Несохранённая причина привязки A",
  );
  await expect(hypothesis.getByLabel("Обоснование проверки")).toHaveValue(
    "Черновик решения гипотезы A",
  );
  await expect(hypothesis.getByLabel("Исправленный текст")).toHaveValue(
    "Черновик исправленного условия",
  );
  let cancellationObserved = false;
  await page.evaluate(() => {
    document.documentElement.dataset.reviewReloadWitness = "original-document";
  });
  page.once("dialog", async (dialog) => {
    cancellationObserved = dialog.type() === "beforeunload";
    await dialog.dismiss();
  });
  await page.reload({ timeout: 5000 }).catch(() => {});
  expect(cancellationObserved).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.dataset.reviewReloadWitness,
    ),
  ).toBe("original-document");
  await expect(page.getByLabel("Обоснование решения по R2")).toHaveValue(
    "Черновик причины отдельного решения R2",
  );
  let acceptanceObserved = false;
  page.once("dialog", async (dialog) => {
    acceptanceObserved = dialog.type() === "beforeunload";
    await dialog.accept();
  });
  await page.reload();
  expect(acceptanceObserved).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.dataset.reviewReloadWitness,
    ),
  ).toBeUndefined();
  await expect(page.getByLabel("Новая расшифровка по оригиналу")).toHaveValue(
    "DEMO: редактируемая расшифровка A",
  );
  await expect(
    page.getByLabel("Причина исправления", { exact: true }),
  ).toHaveValue("Сверяю буквы по оригиналу");
  await expect(page.getByLabel("Обоснование решения по R2")).toHaveValue(
    "Черновик причины отдельного решения R2",
  );
  await expect(page.getByLabel("Проверенное условие оплаты")).not.toHaveValue(
    "",
  );
  await expect(
    page.getByText("Восстановлен локальный черновик этого материала", {
      exact: false,
    }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    Object.entries(sessionStorage)
      .filter(([key]) => key.startsWith("saq:review-draft:"))
      .map(([, value]) => value)
      .join("\n"),
  );
  expect(stored).not.toContain(a.original_text);
  expect(commands).toBe(0);
});

test("409 retains the reason and idempotency key through navigation, successful explicit retry clears persisted input", async ({
  page,
}) => {
  await login(page);
  const materials = await mockMaterials(page, 2);
  const registry: Page<Property> = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const keys: string[] = [];
  let success = false;
  // Command response fixture checks recovery only, not a real domain transition.
  await page.route(
    `**/api/v1/advertisements/${materials[0].id}/matches`,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      keys.push(route.request().headers()["idempotency-key"]);
      return route.fulfill(
        success
          ? { json: { id: fixtureId(500) } }
          : {
              status: 409,
              json: {
                error: {
                  message: "DEMO: версия изменилась, обновите материал",
                },
              },
            },
      );
    },
  );
  await page.goto(`/review?advertisement_id=${materials[0].id}`);
  await page
    .getByLabel("ЖК / очередь · можно выбрать вручную")
    .selectOption(registry.items[0].id);
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("DEMO: причина после конфликта сохраняется");
  await page
    .getByRole("button", { name: "Подтвердить привязку", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "версия изменилась",
  );
  await choose(page, materials[1].source_label);
  await expect(page).toHaveURL(new RegExp(materials[1].id));
  await page.goBack();
  await expect(page.getByLabel("Обоснование выбора / отклонения")).toHaveValue(
    "DEMO: причина после конфликта сохраняется",
  );
  expect(keys).toHaveLength(1);
  success = true;
  await page
    .getByRole("button", { name: "Подтвердить привязку", exact: true })
    .click();
  await expect.poll(() => keys.length).toBe(2);
  expect(keys[1]).toBe(keys[0]);
  await expect(
    page.getByRole("button", { name: "Подтвердить привязку", exact: true }),
  ).toBeEnabled();
  await choose(page, materials[1].source_label);
  await expect(page).toHaveURL(new RegExp(materials[1].id));
  await page.goBack();
  await expect(page.getByLabel("Обоснование выбора / отклонения")).toHaveValue(
    "",
  );
});

test("late queue response cannot replace newer filters and queue errors preserve direct material access", async ({
  page,
}) => {
  await login(page);
  const materials = await mockMaterials(page, 2);
  let release!: () => void;
  let started!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const waiting = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/v1/advertisements?*", async (route) => {
    const status = new URL(route.request().url()).searchParams.get("status");
    if (status !== "FAILED") return route.fallback();
    started();
    await held;
    await route
      .fulfill({
        json: {
          items: [{ ...materials[0], source_label: "DEMO late obsolete row" }],
          page: 1,
          page_size: 20,
          total: 1,
        },
      })
      .catch(() => {});
  });
  await page.goto(`/review?advertisement_id=${materials[0].id}`);
  await expect(page.locator(".review-provenance")).toContainText(
    materials[0].source_label,
  );
  await page
    .getByText("Сменить материал · очередь и фильтры", { exact: true })
    .click();
  await page
    .getByLabel("Состояние материала", { exact: true })
    .selectOption("FAILED");
  await waiting;
  await expect(page.locator(".review-queue")).toContainText("Загрузка данных");
  await expect(page.locator(".review-queue-item")).toHaveCount(0);
  await page
    .getByLabel("Состояние материала", { exact: true })
    .selectOption("NEW");
  await expect(page).toHaveURL(/status=NEW/);
  await expect(page.locator(".review-queue")).toContainText("0 материалов");
  release();
  await expect(page.locator(".review-queue")).not.toContainText(
    "DEMO late obsolete row",
  );
  await expect(page.locator(".review-provenance")).toContainText(
    materials[0].source_label,
  );
  await page.route("**/api/v1/advertisements?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "DEMO queue unavailable" } },
    }),
  );
  await page
    .getByLabel("Состояние материала", { exact: true })
    .selectOption("READY_FOR_REVIEW");
  await expect(page.locator(".review-queue").getByRole("alert")).toContainText(
    "queue unavailable",
  );
  await expect(
    page
      .locator(".review-queue")
      .getByRole("button", { name: "Повторить загрузку", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".review-provenance")).toContainText(
    materials[0].source_label,
  );
});

test("invalid stored types are ignored and storage quota fallback preserves SPA drafts", async ({
  page,
}) => {
  await login(page);
  const materials = await mockMaterials(page, 2);
  await page.goto(`/review?advertisement_id=${materials[0].id}`);
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("Initial draft");
  const storageKey = await page.evaluate(
    (id) =>
      Object.keys(sessionStorage).find((key) =>
        key.endsWith(`material:${id}`),
      )!,
    materials[0].id,
  );
  await choose(page, materials[1].source_label);
  await expect(page).toHaveURL(new RegExp(materials[1].id));
  await page.evaluate(
    (key) =>
      sessionStorage.setItem(
        key,
        JSON.stringify({
          updatedAt: Date.now(),
          values: {
            matchReason: true,
            propertyId: null,
            transcriptionEditing: "true",
            commandKey: false,
          },
        }),
      ),
    storageKey,
  );
  await page.goBack();
  await expect(page.getByLabel("Обоснование выбора / отклонения")).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("ЖК / очередь · можно выбрать вручную"),
  ).toHaveValue("");
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith("saq:review-draft:") && key.includes("material:"))
        throw new DOMException("DEMO quota fixture", "QuotaExceededError");
      return setItem.call(this, key, value);
    };
  });
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("Memory-only draft survives material changes");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "только в памяти",
  );
  await choose(page, materials[1].source_label);
  await expect(page).toHaveURL(new RegExp(materials[1].id));
  await page.goBack();
  await expect(page.getByLabel("Обоснование выбора / отклонения")).toHaveValue(
    "Memory-only draft survives material changes",
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "только в памяти",
  );
});

test("successful logout clears the active user's tab draft namespace", async ({
  page,
}) => {
  await login(page);
  const materials = await mockMaterials(page, 2);
  await page.goto(`/review?advertisement_id=${materials[0].id}`);
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("DEMO: private review input before logout");
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) =>
        key.startsWith("saq:review-draft:"),
      ),
    ),
  ).toBe(true);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) =>
        key.startsWith("saq:review-draft:"),
      ),
    ),
  ).toBe(false);
});

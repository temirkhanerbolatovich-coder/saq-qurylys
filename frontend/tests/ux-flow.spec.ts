import { expect, test } from "@playwright/test";
import { login } from "./support";
import type {
  Advertisement,
  Extraction,
  Page as ResultPage,
  Signal,
} from "../lib/types";

test("saved text opens review directly without starting analysis or changing the original", async ({
  page,
}) => {
  await login(page);
  await page.goto("/advertisements/new");
  const text = "DEMO Ә Ғ Қ Ң Ө Ұ Ү Һ І. Оригинал сохраняется без изменений.";
  await page
    .getByLabel("Источник / описание происхождения")
    .fill(`DEMO UX ${Date.now()}`);
  await page.getByLabel("Оригинальный текст", { exact: true }).fill(text);
  await expect(page.locator("#ad-text-count")).toContainText(
    `${text.length} / 100 000`,
  );
  await page
    .getByRole("button", { name: "Сохранить публикацию", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Публикация добавлена" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Результат сохранения публикации" }),
  ).toBeFocused();
  await page
    .getByRole("link", { name: "Перейти к проверке", exact: true })
    .click();
  await expect(page).toHaveURL(/\/review\?advertisement_id=/);
  const id = new URL(page.url()).searchParams.get("advertisement_id");
  expect(id).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Запустить анализ", exact: true }),
  ).toBeVisible();
  const ad: Advertisement = await (
    await page.request.get(`/api/v1/advertisements/${id}`)
  ).json();
  expect(ad.original_text).toBe(text);
  expect(ad.status).toBe("NEW");
  const steps = page.getByRole("navigation", {
    name: "Этапы проверки материала",
  });
  await expect(steps.locator("li")).toHaveCount(4);
  await expect(steps.getByText("Сначала запустите анализ")).toBeVisible();
  await expect(
    steps.getByText("Фактор R2", { exact: true }).locator(".."),
  ).toHaveAttribute("aria-disabled", "true");
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const user = await (await page.request.get("/api/v1/auth/me")).json();
  // Presentation-only role substitution; backend authorization is unchanged.
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...user, role: "viewer" } }),
  );
  await page.reload();
  await expect(steps).toContainText("Ожидает анализа аналитиком");
  await expect(
    page.getByRole("button", { name: "Запустить анализ", exact: true }),
  ).toHaveCount(0);
});

test("file selection explains the size limit before upload and preserves an invalid selection", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.goto("/advertisements/upload");
  const input = page.getByLabel("Оригинальный PNG / JPEG / TXT", {
    exact: true,
  });
  await input.setInputFiles({
    name: "DEMO-құжат.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("DEMO Қазақша мәтін"),
  });
  await expect(page.locator("#image-file-selection")).toContainText(
    "DEMO-құжат.txt",
  );
  await expect(input).toHaveAttribute("aria-invalid", "false");
  await input.setInputFiles({
    name: "DEMO-too-large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(10_485_761),
  });
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#image-file-selection")).toContainText(
    "превышен лимит 10 МБ",
  );
  await page
    .getByLabel("Источник / происхождение", { exact: true })
    .fill("DEMO UX file check");
  let uploads = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().endsWith("/advertisements/upload")
    )
      uploads++;
  });
  await page
    .getByRole("button", { name: "Сохранить файл", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Файл должен быть не больше 10 МБ" }),
  ).toBeVisible();
  expect(uploads).toBe(0);
  await expect(page.locator("#image-file-selection")).toContainText(
    "DEMO-too-large.png",
  );
});

test("review steps report actual hypothesis decisions and preserve an unsaved match reason", async ({
  page,
}) => {
  await login(page);
  const ads: ResultPage<Advertisement> = await (
    await page.request.get("/api/v1/advertisements?page_size=100")
  ).json();
  const ad = ads.items.find((item) => item.status === "READY_FOR_REVIEW");
  expect(ad).toBeTruthy();
  const extractions: Extraction[] = await (
    await page.request.get(`/api/v1/advertisements/${ad!.id}/extractions`)
  ).json();
  expect(extractions.length).toBeGreaterThan(0);
  const extraction = extractions[0];
  const reviewed = extraction.hypotheses.filter((item) =>
    ["CONFIRMED", "CORRECTED", "REJECTED"].includes(item.review_status),
  ).length;
  await page.goto(`/review?advertisement_id=${ad!.id}`);
  const steps = page.getByRole("navigation", {
    name: "Этапы проверки материала",
  });
  await expect(steps).toContainText(
    `Проверено ${reviewed} из ${extraction.hypotheses.length}`,
  );
  await steps.getByRole("link", { name: /Объект и очередь/ }).click();
  await expect(page.locator(`[id="review-match-${ad!.id}"]`)).toBeFocused();
  const reason = page.getByLabel("Обоснование выбора / отклонения", {
    exact: true,
  });
  await reason.fill("DEMO unsaved match draft");
  await steps.getByRole("link", { name: /Гипотезы/ }).click();
  await expect(
    page.locator(`[id="review-hypotheses-${ad!.id}"]`),
  ).toBeFocused();
  await expect(reason).toHaveValue("DEMO unsaved match draft");
  await steps.getByRole("link", { name: /Оригинал/ }).click();
  await expect(page.locator(".original-panel")).toBeFocused();
});

test("signal filters survive version selection, reload and browser history", async ({
  page,
}) => {
  await login(page);
  const signals: ResultPage<Signal> = await (
    await page.request.get("/api/v1/signals?page_size=1")
  ).json();
  expect(signals.items.length).toBeGreaterThan(0);
  const signal = signals.items[0];
  const query = new URLSearchParams({
    state: signal.state,
    property_id: signal.property_id,
  });
  await page.goto(`/signals?${query}`);
  const open = page
    .locator(".signals-queue")
    .getByRole("button", { name: /Открыть версию/ })
    .first();
  await expect(open).toBeVisible();
  await open.click();
  await expect(page).toHaveURL(/signal_id=/);
  await expect(page.locator("#selected-signal")).toBeFocused();
  expect(new URL(page.url()).searchParams.get("state")).toBe(signal.state);
  expect(new URL(page.url()).searchParams.get("property_id")).toBe(
    signal.property_id,
  );
  expect(new URL(page.url()).searchParams.get("signal_id")).toBeTruthy();
  await page.reload();
  const historyLink = page
    .getByTestId("signal-detail")
    .getByRole("link", { name: /^Версия / })
    .first();
  await expect(historyLink).toBeVisible();
  const historyUrl = new URL(
    (await historyLink.getAttribute("href"))!,
    page.url(),
  );
  expect(historyUrl.searchParams.get("state")).toBe(signal.state);
  expect(historyUrl.searchParams.get("property_id")).toBe(signal.property_id);
  await expect(page.getByLabel("Статус сигнала", { exact: true })).toHaveValue(
    signal.state,
  );
  await expect(page.getByLabel("Объект сигнала", { exact: true })).toHaveValue(
    signal.property_id,
  );
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/signals\\?${query.toString()}$`));
  await page.getByLabel("Статус сигнала", { exact: true }).selectOption("");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("state"))
    .toBeNull();
  await page.goBack();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("state"))
    .toBe(signal.state);
  await expect(page.getByLabel("Статус сигнала", { exact: true })).toHaveValue(
    signal.state,
  );
  await page
    .getByRole("button", { name: "Сбросить фильтры сигналов", exact: true })
    .click();
  await expect(page.getByLabel("Объект сигнала", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("Статус сигнала", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Объект сигнала", { exact: true }),
  ).toBeFocused();
});

test("a pending signal filter never presents the previous queue as its own results", async ({
  page,
}) => {
  await login(page);
  await page.goto("/signals");
  await expect(page.locator(".signal-queue-item").first()).toBeVisible();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/v1\/signals\?/, async (route) => {
    await gate;
    await route.fulfill({
      json: { items: [], total: 0, page: 1, page_size: 25 },
    });
  });
  try {
    await page
      .getByLabel("Статус сигнала", { exact: true })
      .selectOption("DRAFT");
    await expect(
      page.getByRole("status").filter({ hasText: "Загрузка сигналов" }),
    ).toBeVisible();
    await expect(page.locator(".signal-queue-item")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(
    page.getByText("Сигналов по выбранным фильтрам нет.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".signal-queue-item")).toHaveCount(0);
});

test("signal page search preserves the selected snapshot and labels the scope of counts", async ({
  page,
}) => {
  await login(page);
  const signals: ResultPage<Signal> = await (
    await page.request.get("/api/v1/signals?page_size=1")
  ).json();
  expect(signals.items.length).toBeGreaterThan(0);
  const signal = signals.items[0];
  let queueRequests = 0;
  // Presentation fixture: total exceeds the loaded page; no backend data changes.
  await page.route(/\/api\/v1\/signals\?/, async (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get("page_size") !== "25") return route.continue();
    queueRequests++;
    return route.fulfill({
      json: { items: [signal], total: 51, page: 1, page_size: 25 },
    });
  });
  await page.goto(`/signals?signal_id=${signal.id}`);
  const panel = page.getByTestId("signal-detail");
  await expect(
    panel.getByRole("heading", {
      name: `Сигнал · версия ${signal.version}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".signal-queue-item")).toHaveCount(1);
  const summary = page.getByRole("region", { name: "Сводка сигналов" });
  await expect(summary).toContainText("По выбранным фильтрам");
  await expect(summary).toContainText("51");
  await expect(
    summary.getByText("На текущей странице", { exact: true }),
  ).toHaveCount(2);
  await expect(page.locator(".signals-extra-filters")).not.toHaveAttribute(
    "open",
    "",
  );
  const search = page.getByLabel("Поиск на текущей странице сигналов", {
    exact: true,
  });
  const requestsBeforeSearch = queueRequests;
  await search.fill("DEMO отсутствует-на-странице");
  await expect(page.locator(".signal-queue-item")).toHaveCount(0);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "ничего не найдено на этой странице" }),
  ).toBeVisible();
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`signal_id=${signal.id}$`));
  await expect(page.locator("#signal-search-help")).toContainText(
    "выбранный снимок остаётся открытым",
  );
  expect(queueRequests).toBe(requestsBeforeSearch);
  await search.fill(signal.id);
  await expect(page.locator(".signal-queue-item")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Сбросить фильтры сигналов", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(
    page.getByLabel("Объект сигнала", { exact: true }),
  ).toBeFocused();
});

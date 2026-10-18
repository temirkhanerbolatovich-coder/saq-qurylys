import { expect, test } from "@playwright/test";
import { login } from "./support";
import type { Property } from "../lib/types";

test("work action and oldest review precede score without inventing deadlines", async ({
  page,
}) => {
  await login(page);
  const { items } = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  // Deliberately conflicting scores prove that the work queue is not risk DESC.
  const rows = [
    {
      ...items[0],
      name: "DEMO подтверждённый90",
      legal_verification_status: "VERIFIED_VALID",
      last_reviewed_at: "2026-10-12T00:00:00Z",
      risk: { ...items[0].risk, score: 90 },
    },
    {
      ...items[1],
      name: "DEMO неизвестный60",
      legal_verification_status: "UNKNOWN",
      last_reviewed_at: null,
      risk: { ...items[1].risk, score: 60 },
    },
    {
      ...items[2],
      name: "DEMO ожидающий5старый",
      legal_verification_status: "PENDING",
      last_reviewed_at: "2026-10-10T00:00:00Z",
      risk: { ...items[2].risk, score: 5 },
    },
    {
      ...items[3],
      name: "DEMO ожидающий35новый",
      legal_verification_status: "PENDING",
      last_reviewed_at: "2026-10-12T00:00:00Z",
      risk: { ...items[3].risk, score: 35 },
    },
  ];
  await page.route("**/api/v1/properties?page_size=100", (route) =>
    route.fulfill({
      json: { items: rows, page: 1, page_size: 100, total: 140 },
    }),
  );
  await page.reload();
  await expect(page.locator(".priority-list .object-name")).toHaveText([
    rows[2].name,
    rows[3].name,
    rows[1].name,
    rows[0].name,
  ]);
  await expect(page.locator(".priority-list .zone strong")).toHaveText([
    "5",
    "35",
    "60",
    "90",
  ]);
  await expect(
    page.getByText("Сроки задач не установлены.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".queue-scope")).toContainText("первых 4");
});

test("picker reaches the 101st object, preserves selection through searches, errors and reload without commands", async ({
  page,
}) => {
  await login(page);
  const rows = (
    await (await page.request.get("/api/v1/properties?page_size=100")).json()
  ).items as Property[];
  await page.goto("/advertisements/new");
  await page
    .getByLabel("Источник / описание происхождения")
    .fill("DEMO picker acceptance");
  await page
    .getByLabel("Оригинальный текст", { exact: true })
    .fill("DEMO ЖК Ертіс. Перечислите 500 000 тенге для закрепления квартиры.");
  await page
    .getByRole("button", { name: "Сохранить публикацию", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Перейти к проверке", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Запустить анализ", exact: true })
    .click();
  await expect(page.locator("#match-property")).toBeVisible({ timeout: 30000 });
  const ad = await (
    await page.request.get(
      `/api/v1/advertisements/${new URL(page.url()).searchParams.get("advertisement_id")}`,
    )
  ).json();
  const target = rows.find((item) => item.is_demo === ad.is_demo)!;
  const fakeRows = Array.from({ length: 100 }, (_, index) => ({
    ...target,
    id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name: `DEMO объект ${index}`,
  }));
  let broken = false;
  await page.route("**/api/v1/properties?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (!params.has("is_demo")) return route.continue();
    expect(params.get("is_demo")).toBe(String(ad.is_demo));
    if (broken)
      return route.fulfill({
        status: 503,
        json: { error: { message: "DEMO поиск временно недоступен" } },
      });
    const pageNumber = Number(params.get("page"));
    const matched =
      params.get("q") === "нет совпадений"
        ? []
        : params.get("q")
          ? [target]
          : [...fakeRows, target];
    return route.fulfill({
      json: {
        items: matched.slice((pageNumber - 1) * 25, pageNumber * 25),
        page: pageNumber,
        page_size: 25,
        total: matched.length,
      },
    });
  });
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") commands.push(request.url());
  });
  await page.goto(`/review?advertisement_id=${ad.id}`);
  const picker = page.getByRole("region", {
    name: "Поиск объекта для привязки",
  });
  const next = picker.getByRole("button", {
    name: "Следующая страница",
    exact: true,
  });
  for (let number = 1; number < 5; number++) {
    await expect(
      picker.getByText(`Страница ${number} из 5`, { exact: true }),
    ).toBeVisible();
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(picker.locator("#match-property")).toBeFocused();
  }
  await expect(picker.locator("option")).toContainText([
    "Выберите точный объект",
    target.name,
  ]);
  await picker
    .getByLabel("ЖК / очередь · можно выбрать вручную")
    .selectOption(target.id);
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill("DEMO незавершённый выбор 101");
  await picker
    .getByLabel("Найти ЖК по названию или адресу")
    .fill("нет совпадений");
  await picker.getByRole("button", { name: "Найти ЖК", exact: true }).click();
  await expect(
    picker.getByText("Объекты не найдены.", { exact: false }),
  ).toBeVisible();
  await expect(picker.locator("#match-property")).toHaveValue(target.id);
  broken = true;
  await picker.getByLabel("Найти ЖК по названию или адресу").fill("ошибка");
  await picker.getByRole("button", { name: "Найти ЖК", exact: true }).click();
  await expect(picker.getByRole("alert")).toContainText("недоступен");
  await expect(picker.locator("#match-property")).toHaveValue(target.id);
  broken = false;
  await picker
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(
    picker.getByText("Найдено ЖК: 1.", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(picker.locator("#match-property")).toHaveValue(target.id);
  await expect(page.getByLabel("Обоснование выбора / отклонения")).toHaveValue(
    "DEMO незавершённый выбор 101",
  );
  expect(commands).toEqual([]);
});

test("collapsed documents keep decisions mounted and visible metadata at all required widths", async ({
  page,
}) => {
  await login(page);
  const rows = (
    await (await page.request.get("/api/v1/properties?page_size=100")).json()
  ).items as Property[];
  const row = rows.find((item) => item.name.includes("Өркен"))!;
  await page.route(`**/api/v1/properties/${row.id}`, async (route) => {
    const response = await route.fetch();
    const detail = await response.json();
    detail.legal_bases[0].evidence_ids = [
      "10000000-0000-4000-8000-000000000001",
    ];
    await route.fulfill({ response, json: detail });
  });
  await page.goto(`/properties/${row.id}`);
  const card = page.locator(".dossier-document").first();
  await expect(card).not.toHaveAttribute("open", "");
  await expect(card.locator("summary")).toContainText("Охват:");
  await expect(card.locator("summary")).toContainText("Период:");
  await card.locator("summary").click();
  const reason = card.getByLabel("Обоснование проверки основания");
  await reason.fill("DEMO Әділет — черновик решения");
  await card.locator("summary").click();
  await expect(reason).toBeHidden();
  await card.locator("summary").click();
  await expect(reason).toHaveValue("DEMO Әділет — черновик решения");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/ux-stabilization-20261018/dossier-${width}.png`,
      fullPage: true,
    });
  }
});

test("registry restores city filter, selected marker, focus and scroll after dossier reload", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>',
    }),
  );
  await login(page);
  const rows = (
    await (await page.request.get("/api/v1/properties?page_size=100")).json()
  ).items as Property[];
  const row = rows.find((item) => item.latitude !== null)!;
  await page.goto(`/properties?view=map&city=${encodeURIComponent(row.city)}`);
  await expect(page.getByLabel("Фильтр по городу")).toHaveValue(row.city);
  const marker = page.getByRole("button", {
    name: new RegExp(`Выбрать ${row.name}`),
  });
  await marker.click();
  const card = page.getByRole("region", {
    name: "Выбранный объект",
    exact: true,
  });
  const link = card.getByRole("link", {
    name: "Открыть карточку",
    exact: true,
  });
  await link.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/properties/${row.id}\\?registry=`));
  await expect(
    page.getByRole("heading", { name: row.name, exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "К реестру", exact: true }).click();
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  await expect(link).toBeFocused();
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - y),
  ).toBeLessThanOrEqual(3);
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await expect(page.getByLabel("Фильтр по городу")).toHaveValue("");
});

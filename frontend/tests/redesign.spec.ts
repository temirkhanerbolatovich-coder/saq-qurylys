import { expect, test } from "@playwright/test";
import { login } from "./support";
import { comparePropertyWork } from "../lib/property-priority";
import type { Advertisement, Page as ResultPage, Property } from "../lib/types";

test("dossier return retains registry search, page, and view after reload", async ({
  page,
}) => {
  await login(page);
  await page.goto("/properties?q=DEMO&page_size=2&page=2");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  const name = await page.locator("tbody .object-name").first().innerText();
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(/registry=/);
  await page.reload();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "К реестру", exact: true }).click();
  await expect(page).toHaveURL(/\/properties\?q=DEMO&page_size=2&page=2$/);
  await expect(page.locator("tbody .object-name").first()).toHaveText(name);
  await expect(page.getByLabel("Поиск ЖК или адреса")).toHaveValue("DEMO");
});

test("dashboard scopes its priority list and displays the unchanged server scores", async ({
  page,
}) => {
  await login(page);
  const registry: ResultPage<Property> = await (
    await page.request.get("/api/v1/properties?page_size=100")
  ).json();
  const rows = [...registry.items].sort(comparePropertyWork).slice(0, 5);
  await expect(page.locator(".priority-list li")).toHaveCount(rows.length);
  for (const [index, row] of rows.entries()) {
    const item = page.locator(".priority-list li").nth(index);
    await expect(
      item.getByRole("link", { name: row.name, exact: true }),
    ).toBeVisible();
    await expect(item.locator(".zone strong")).toHaveText(
      String(row.risk.score),
    );
  }
  await expect(page.locator(".queue-scope")).toContainText(
    `из ${registry.total} объектов`,
  );
  await expect(
    page.getByRole("link", { name: "Открыть новые материалы" }),
  ).toHaveAttribute("href", "/advertisements?status=NEW");
});

test("publication pagination and status use server metadata and survive detail return", async ({
  page,
}) => {
  await login(page);
  const ads: ResultPage<Advertisement> = await (
    await page.request.get("/api/v1/advertisements?page_size=2")
  ).json();
  // A two-row presentation fixture exercises pagination without creating 26 documents.
  await page.route(/\/api\/v1\/advertisements\?/, (route) => {
    const current = Number(
      new URL(route.request().url()).searchParams.get("page") || 1,
    );
    return route.fulfill({
      json: {
        ...ads,
        page: current,
        page_size: 1,
        total: 2,
        items: [ads.items[current - 1]],
      },
    });
  });
  await page.goto("/advertisements?status=NEW");
  const pagination = page.getByRole("navigation", {
    name: "Страницы публикаций",
  });
  await expect(pagination.getByRole("status")).toHaveText("Страница 1 из 2");
  await pagination
    .getByRole("button", { name: "Следующая", exact: true })
    .click();
  await expect(page).toHaveURL(/status=NEW&page=2/);
  await expect(pagination.getByRole("status")).toHaveText("Страница 2 из 2");
  await page
    .getByRole("link", { name: ads.items[1].source_label, exact: true })
    .click();
  await expect(page).toHaveURL(/materials=/);
  await page.getByRole("link", { name: "К публикациям", exact: true }).click();
  await expect(page).toHaveURL(/status=NEW&page=2/);
  await page
    .getByLabel("Состояние обработки", { exact: true })
    .selectOption("READY_FOR_REVIEW");
  await expect(page).toHaveURL(/status=READY_FOR_REVIEW$/);
  await page
    .getByRole("button", { name: "Сбросить фильтры", exact: true })
    .click();
  await expect(
    page.getByLabel("Состояние обработки", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Состояние обработки", { exact: true }),
  ).toBeFocused();
});

test("publication filter never presents the previous queue during a request or error", async ({
  page,
}) => {
  await login(page);
  await page.goto("/advertisements");
  await expect(page.locator(".ad-row").first()).toBeVisible();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/advertisements?status=FAILED", async (route) => {
    await gate;
    await route.fulfill({
      status: 503,
      json: { error: { message: "DEMO publication queue unavailable" } },
    });
  });
  try {
    await page
      .getByLabel("Состояние обработки", { exact: true })
      .selectOption("FAILED");
    await expect(
      page.getByRole("status").filter({ hasText: "Загрузка данных" }),
    ).toBeVisible();
    await expect(page.locator(".ad-row")).toHaveCount(0);
  } finally {
    release();
  }
  const queueError = page
    .getByRole("alert")
    .filter({ hasText: "DEMO publication queue unavailable" });
  await expect(queueError).toBeVisible();
  await expect(page.locator(".ad-row")).toHaveCount(0);
  await page.unroute("**/api/v1/advertisements?status=FAILED");
  await page
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(queueError).toHaveCount(0);
  await expect(
    page.getByLabel("Состояние обработки", { exact: true }),
  ).toHaveValue("FAILED");
});

test("risk dossier reflows at 320 CSS pixels and reduced motion disables feedback animation", async ({
  page,
}) => {
  await login(page);
  const registry: ResultPage<Property> = await (
    await page.request.get("/api/v1/properties")
  ).json();
  const row = registry.items.find((item) => item.risk.zone === "RED")!;
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/properties/${row.id}`);
    await expect(page.locator(".dossier-compact-state")).toContainText(
      String(row.risk.score),
    );
    await page
      .getByRole("tab", { name: "Проверка и риски", exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const button = page
      .getByRole("button", { name: "Доказательства", exact: true })
      .first();
    await button.click();
    await expect(
      page.getByRole("tab", { name: "Документы", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".evidence-list")).toBeVisible();
    expect(
      await page
        .locator(".evidence-list")
        .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
    ).toBeLessThanOrEqual(0.01);
    await page
      .getByRole("tab", { name: "Проверка и риски", exact: true })
      .click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  }
});

test("review material selection is restored by Back and reload without starting analysis", async ({
  page,
}) => {
  await login(page);
  const ads: ResultPage<Advertisement> = await (
    await page.request.get("/api/v1/advertisements?page_size=2")
  ).json();
  const commands: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/analyze"))
      commands.push(request.url());
  });
  await page.goto(`/review?advertisement_id=${ads.items[0].id}`);
  const queue = page.getByRole("region", {
    name: "Очередь проверки",
    exact: true,
  });
  await queue
    .getByText("Сменить материал · очередь и фильтры", { exact: true })
    .click();
  await queue.locator(`[data-advertisement-id="${ads.items[1].id}"]`).click();
  await expect(page).toHaveURL(
    new RegExp(`advertisement_id=${ads.items[1].id}`),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Запустить анализ|Повторить анализ/ }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(
    new RegExp(`advertisement_id=${ads.items[0].id}`),
  );
  await expect(
    page.getByRole("button", { name: /Запустить анализ|Повторить анализ/ }),
  ).toBeVisible();
  expect(commands).toEqual([]);
});

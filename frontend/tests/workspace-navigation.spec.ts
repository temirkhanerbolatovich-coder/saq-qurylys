import { expect, test } from "@playwright/test";
import { login } from "./support";

test("five work zones stay accessible in both views and monitoring belongs to checking", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const mainNav = page.getByRole("navigation", {
    name: "Основная навигация",
    exact: true,
  });
  const zones = ["Обзор", "Объекты", "Реклама", "Проверка", "Сигналы"];
  for (const width of [360, 375, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(mainNav.getByRole("link")).toHaveCount(5);
    for (const name of zones)
      await expect(
        mainNav.getByRole("link", { name, exact: true }),
      ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Подробный вид", exact: true })
    .click();
  await expect(mainNav.getByRole("link")).toHaveCount(5);
  await page.reload();
  await expect(mainNav.getByRole("link")).toHaveCount(5);
  await page.goto("/monitoring?state=OPEN");
  await expect(
    mainNav.getByRole("link", { name: "Проверка", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(mainNav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(
    page
      .getByRole("navigation", { name: "Проверки", exact: true })
      .getByRole("link", { name: "Сверка", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page).toHaveURL(/state=OPEN/);
  await page
    .getByRole("navigation", { name: "Проверки", exact: true })
    .getByRole("link", { name: "Сравнение публикаций", exact: true })
    .click();
  await expect(mainNav.getByRole("link")).toHaveCount(5);
  await expect(
    mainNav.getByRole("link", { name: "Проверка", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByRole("navigation", { name: "Проверки", exact: true })
      .getByRole("link", { name: "Сравнение публикаций", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("work queues use server totals and processing failure keeps the other actions available", async ({
  page,
}) => {
  await login(page, { detailed: false });
  const [summary, unresolved, failed] = await Promise.all([
    page.request
      .get("/api/v1/dashboard/summary")
      .then((response) => response.json()),
    page.request
      .get("/api/v1/advertisements/review-queue?page_size=1")
      .then((response) => response.json()),
    page.request
      .get("/api/v1/advertisements?status=FAILED&page_size=1")
      .then((response) => response.json()),
  ]);
  const cases = [
    [
      "Новые публикации",
      summary.new_advertisements,
      "/advertisements?status=NEW",
    ],
    [
      "Материалы с нерешёнными действиями",
      unresolved.total,
      "/review?queue=actions",
    ],
    ["Ошибки обработки", failed.total, "/review?status=FAILED"],
    ["Сигналы без решения", summary.pending_signals, "/signals?state=DRAFT"],
  ] as const;
  for (const [title, total, href] of cases) {
    const queue = page
      .locator(".action-queue")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await expect(queue.locator(".rail-number")).toHaveText(String(total));
    await expect(queue.getByRole("link")).toHaveAttribute("href", href);
  }
  // Presentation failure only: the real API is unchanged.
  await page.route(
    "**/api/v1/advertisements?status=FAILED&page_size=1",
    (route) =>
      route.fulfill({
        status: 503,
        json: { error: { message: "DEMO очередь ошибок временно недоступна" } },
      }),
  );
  await page.reload();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "DEMO очередь ошибок временно недоступна" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Открыть очередь решений",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Открыть ошибки", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".action-queue")
      .filter({ hasText: "Ошибки обработки" })
      .locator(".rail-number"),
  ).toHaveText("—");
  await page.unroute("**/api/v1/advertisements?status=FAILED&page_size=1");
  const failedQueue = page.locator(".action-queue").filter({
    has: page.getByRole("heading", { name: "Ошибки обработки", exact: true }),
  });
  await failedQueue
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(failedQueue.locator(".rail-number")).toHaveText(
    String(failed.total),
  );
});

test("nested pages have breadcrumbs and the viewer retains reading navigation", async ({
  page,
}) => {
  await login(page, { detailed: false });
  await page.goto("/advertisements/import-url");
  const crumbs = page.getByRole("navigation", {
    name: "Путь к странице",
    exact: true,
  });
  await expect(
    crumbs.getByRole("link", { name: "Реклама", exact: true }),
  ).toHaveAttribute("href", "/advertisements");
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText(
    "Импорт по ссылке",
  );
  const current = await (await page.request.get("/api/v1/auth/me")).json();
  // Viewer presentation; backend permission tests are separate.
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...current, role: "viewer" } }),
  );
  await page.goto("/dashboard");
  await page.reload();
  await expect(
    page
      .getByRole("navigation", { name: "Основная навигация" })
      .getByRole("link"),
  ).toHaveCount(5);
  await expect(
    page.getByRole("link", { name: "Добавить публикацию", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Открыть публикации", exact: true }),
  ).toBeVisible();
});

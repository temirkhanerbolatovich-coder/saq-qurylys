import { expect, test } from "@playwright/test";
import { login, openMonitoringTool, testOrigin } from "./support";

test("sources and run history show real disabled attempt, preserve URL and drafts without implicit POST", async ({
  page,
}) => {
  test.skip(
    new URL(testOrigin).port === "3000",
    "Write acceptance requires an isolated environment",
  );
  await login(page);
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const query = `DEMO Өскемен ${crypto.randomUUID()}`;
  const response = await page.request.post(
    "/api/v1/monitoring/threads/search",
    {
      headers: {
        Origin: testOrigin,
        "X-CSRF-Token": csrf,
        "Idempotency-Key": crypto.randomUUID(),
      },
      data: { query },
    },
  );
  expect(response.status()).toBe(503);
  await page.goto("/monitoring?section=sources&q=retain-selected-context");
  const posts: string[] = [];
  const errors: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const catalog = page.getByRole("region", {
    name: "Источники и доступ",
    exact: true,
  });
  await expect(catalog).toBeVisible();
  const row = catalog
    .getByRole("row")
    .filter({ has: page.getByText("Поиск Threads", { exact: true }) });
  await expect(row).toContainText("Выключен");
  await row.getByRole("button", { name: "Открыть инструмент" }).click();
  const draft = page.getByLabel("Поисковая фраза Threads", { exact: true });
  await draft.fill("DEMO незавершённый поиск Әділет");
  await page.getByRole("tab", { name: "Запуски", exact: true }).click();
  await page.getByRole("button", { name: query, exact: true }).click();
  await expect(page).toHaveURL(/run_id=/);
  await expect(page).toHaveURL(/q=retain-selected-context/);
  const details = page.locator(".monitoring-run-detail");
  await expect(details).toContainText("DISABLED");
  await expect(details).toContainText(
    "Результат не получен или исход неизвестен",
  );
  const deepLink = page.url();
  await page.getByRole("tab", { name: "Источники", exact: true }).click();
  await expect(draft).toHaveValue("DEMO незавершённый поиск Әділет");
  await page.getByRole("tab", { name: "Запуски", exact: true }).click();
  await page.reload();
  await expect(details).toContainText(query);
  expect(page.url()).toBe(deepLink);
  await page
    .getByRole("combobox", { name: "Состояние запуска", exact: true })
    .selectOption("EMPTY");
  await expect(page).not.toHaveURL(/run_id=/);
  await expect(page).toHaveURL(/run_state=EMPTY/);
  await page.goBack();
  await expect(details).toContainText(query);
  expect(posts).toEqual([]);
  expect(errors).toEqual([]);
});

test("sources and stored results are responsive RU/KZ; read failures retry GET only", async ({
  page,
}) => {
  await login(page);
  const id = "11111111-1111-4111-8111-111111111111";
  const run = {
    id,
    source_code: "THREADS",
    created_by: id,
    query: {
      query: "DEMO Өскемен ЖК Әділет",
      search_type: "RECENT",
      limit: 20,
    },
    state: "SUCCEEDED",
    started_at: "2026-10-19T10:00:00Z",
    finished_at: "2026-10-19T10:00:02Z",
    error_code: null,
    returned_count: 1,
    duplicate_count: 0,
    saved_count: 0,
    result: {
      raw_response_sha256: "a".repeat(64),
      has_more: true,
      items: [
        {
          id: "123",
          text: "DEMO <script>alert(1)</script> Өскемен пәтер: бөліп төлеу",
          timestamp: null,
          permalink: "https://www.threads.net/@demo/post/XYZ",
        },
      ],
    },
  };
  await page.route("**/api/v1/monitoring/runs?*", (route) =>
    route.fulfill({ json: { items: [run], total: 1, page: 1, page_size: 10 } }),
  );
  let failed = true;
  await page.route(`**/api/v1/monitoring/runs/${id}`, (route) =>
    failed
      ? route.fulfill({
          status: 503,
          json: { error: { message: "DEMO история временно недоступна" } },
        })
      : route.fulfill({ json: run }),
  );
  await page.goto(`/monitoring?section=runs&run_id=${id}`);
  const panel = page.locator("#monitoring-panel-runs");
  await expect(panel.getByRole("alert")).toContainText("временно недоступна");
  failed = false;
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await panel.getByRole("button", { name: "Повторить загрузку" }).click();
  await expect(panel.locator(".monitoring-run-text")).toContainText(
    "<script>alert(1)</script>",
  );
  expect(await panel.locator("script").count()).toBe(0);
  for (const locale of ["ru", "kk"]) {
    if (locale === "kk") {
      await page.evaluate(() => {
        localStorage.setItem("saq-locale", "kk");
        window.dispatchEvent(
          new StorageEvent("storage", { key: "saq-locale", newValue: "kk" }),
        );
      });
      await expect(page.locator("html")).toHaveAttribute("lang", "kk");
    }
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const table = page.getByRole("region", {
        name:
          locale === "ru" ? "Запуски мониторинга" : "Мониторинг іске қосулары",
        exact: true,
      });
      await table.focus();
      await expect(table).toBeFocused();
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: `../output/qa/source-runs-20261019/runs-${locale}-${width}.png`,
          fullPage: true,
        });
      await page.locator("#monitoring-tab-sources").click();
      await expect(
        page.locator(".monitoring-source-table tbody tr"),
      ).toHaveCount(5);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: `../output/qa/source-runs-20261019/sources-${locale}-${width}.png`,
          fullPage: true,
        });
      await page.locator("#monitoring-tab-runs").click();
    }
  }
  expect(posts).toEqual([]);
});

test("saved Threads run link retains candidate ID and other monitoring filters", async ({
  page,
}) => {
  await login(page);
  const id = "11111111-1111-4111-8111-111111111111";
  await page.route("**/api/v1/monitoring/threads/status", (route) =>
    route.fulfill({
      json: {
        state: "CONFIGURED_UNVERIFIED",
        busy: false,
        retry_after_seconds: 0,
        last_attempt: "NOT_RUN",
      },
    }),
  );
  await page.route("**/api/v1/monitoring/threads/search", (route) =>
    route.fulfill({
      json: {
        run_id: id,
        request: route.request().postDataJSON(),
        captured_at: "2026-10-19T10:00:00Z",
        has_more: false,
        duplicate_count: 0,
        items: [],
      },
    }),
  );
  await page.goto(`/monitoring?section=sources&q=retained&candidate_id=${id}`);
  await openMonitoringTool(page, "threads");
  await page
    .getByLabel("Поисковая фраза Threads", { exact: true })
    .fill("Өскемен ЖК");
  await page
    .getByRole("button", { name: "Найти в Threads", exact: true })
    .click();
  const link = page.getByRole("link", {
    name: "Открыть сохранённый запуск",
    exact: true,
  });
  await expect(link).toBeVisible();
  const href = new URL((await link.getAttribute("href"))!, testOrigin);
  expect(href.searchParams.get("q")).toBe("retained");
  expect(href.searchParams.get("candidate_id")).toBe(id);
  expect(href.searchParams.get("section")).toBe("runs");
  expect(href.searchParams.get("run_id")).toBe(id);
});

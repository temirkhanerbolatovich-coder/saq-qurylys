import { expect, test } from "@playwright/test";
import { openMonitoringTool, login } from "./support";

test("Threads reports the real disabled connection without issuing a search", async ({
  page,
}) => {
  await login(page);
  let searches = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/monitoring/threads/search")) searches++;
  });
  await page.goto("/monitoring");
  await openMonitoringTool(page, "threads");
  const panel = page.getByRole("region", {
    name: "Поиск в Threads",
    exact: true,
  });
  await expect(panel.getByRole("status")).toContainText(
    "Поиск Threads выключен",
  );
  await panel
    .getByLabel("Поисковая фраза Threads", { exact: true })
    .fill("Өскемен ЖК");
  await expect(
    panel.getByRole("button", { name: "Найти в Threads", exact: true }),
  ).toBeDisabled();
  expect(searches).toBe(0);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (width === 375 || width === 1440) {
      await panel.screenshot({
        path: `../output/threads-preview/disabled-${width}.png`,
      });
    }
  }
});

test("Threads preview handles fixture results, empty pages and failure without retaining old success", async ({
  page,
}) => {
  await login(page);
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
  let attempt = 0;
  let release: (() => void) | undefined;
  await page.route("**/api/v1/monitoring/threads/search", async (route) => {
    attempt++;
    if (attempt === 2) {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return route.fulfill({
        status: 429,
        json: { error: { message: "DEMO: лимит источника, повторите позже" } },
      });
    }
    const request = route.request().postDataJSON();
    return route.fulfill({
      json: {
        request,
        captured_at: "2026-10-16T14:00:00Z",
        has_more: attempt === 1,
        duplicate_count: 0,
        items:
          attempt === 1
            ? [
                {
                  id: "123",
                  text: "DEMO Өскемен <script>alert(1)</script>",
                  timestamp: null,
                  permalink: "https://www.threads.net/@demo/post/ABC",
                  media_type: "TEXT_POST",
                },
              ]
            : [],
      },
    });
  });
  await page.goto("/monitoring");
  await openMonitoringTool(page, "threads");
  const panel = page.getByRole("region", {
    name: "Поиск в Threads",
    exact: true,
  });
  const query = panel.getByLabel("Поисковая фраза Threads", { exact: true });
  const submit = panel.getByRole("button", {
    name: "Найти в Threads",
    exact: true,
  });
  await query.fill("Өскемен ЖК");
  await query.press("Enter");
  await expect(
    panel.getByRole("heading", { name: "Найдено в Threads: 1" }),
  ).toBeFocused();
  await expect(panel).toContainText("DEMO Өскемен <script>alert(1)</script>");
  await expect(panel).toContainText("следующая страница");
  await expect(panel).toContainText("Не установлена");
  await expect(panel.locator("script")).toHaveCount(0);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (width === 375 || width === 1440) {
      await panel.scrollIntoViewIfNeeded();
      await panel.screenshot({
        path: `../output/threads-preview/results-${width}.png`,
      });
    }
  }
  await submit.click();
  await expect(
    panel.getByText("Ожидаем ответ Threads. Повторный запрос не отправляется."),
  ).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: "Найдено в Threads: 1" }),
  ).toHaveCount(0);
  await expect(query).toBeDisabled();
  await expect(
    panel.getByRole("button", { name: "Идёт поиск…", exact: true }),
  ).toBeDisabled();
  // Busy begins before CSRF retrieval; wait until the mocked source is reached.
  await expect.poll(() => typeof release).toBe("function");
  release!();
  await expect(panel.getByRole("alert")).toContainText("лимит источника");
  await expect(query).toHaveValue("Өскемен ЖК");
  await submit.click();
  await expect(
    panel.getByRole("heading", { name: "Найдено в Threads: 0" }),
  ).toBeVisible();
  await expect(panel).toContainText(
    "не доказывает отсутствие рекламы или разрешения",
  );
  await expect(panel.getByRole("alert")).toHaveCount(0);
});

for (const state of ["TOKEN_MISSING", "TOKEN_INVALID"] as const) {
  test(`Threads ${state} preserves the query and supports connection recovery`, async ({
    page,
  }) => {
    await login(page);
    let connected = false;
    await page.route("**/api/v1/monitoring/threads/status", (route) =>
      route.fulfill({
        json: {
          state: connected ? "CONFIGURED_UNVERIFIED" : state,
          busy: false,
          retry_after_seconds: 0,
          last_attempt: "NOT_RUN",
        },
      }),
    );
    await page.goto("/monitoring");
    await openMonitoringTool(page, "threads");
    const panel = page.getByRole("region", {
      name: "Поиск в Threads",
      exact: true,
    });
    const query = panel.getByLabel("Поисковая фраза Threads", {
      exact: true,
    });
    const submit = panel.getByRole("button", {
      name: "Найти в Threads",
      exact: true,
    });
    await query.fill("Өскемен ЖК");
    await expect(submit).toBeDisabled();
    await expect(panel).toContainText(
      "Администратор должен подключить официальный доступ Threads",
    );
    connected = true;
    await panel
      .getByRole("button", { name: "Обновить подключение Threads" })
      .click();
    await expect(submit).toBeEnabled();
    await expect(query).toHaveValue("Өскемен ЖК");
  });
}

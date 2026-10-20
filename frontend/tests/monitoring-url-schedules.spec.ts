import { expect, test, type Page } from "@playwright/test";

const id = "55555555-5555-4555-8555-555555555555";
const candidate = "11111111-1111-4111-8111-111111111111";
const base = "/api/v1/monitoring/url-schedules";
function row() {
  return {
    id,
    name: "DEMO Өскемен Әділет",
    url: "https://www.angroups.kz/payment",
    source_id: "angroups-payment-v1",
    revision: 1,
    enabled: false,
    interval_minutes: 60,
    next_run_at: null as string | null,
    pause_reason: null,
    failure_count: 0,
  };
}
async function setup(page: Page, role = "analyst") {
  await page.route("**/api/v1/auth/me", (r) =>
    r.fulfill({
      json: {
        id: candidate,
        username: "presentation",
        display_name: "DEMO",
        role,
      },
    }),
  );
  await page.route("**/api/v1/auth/csrf", (r) =>
    r.fulfill({ json: { csrf_token: "presentation" } }),
  );
}
async function open(page: Page, suffix = "") {
  await page.goto(
    `/monitoring?section=sources&q=retained&candidate_id=${candidate}${suffix}`,
  );
  const tool = page
    .locator("details.monitoring-tool")
    .filter({ has: page.locator("#monitoring-schedules-title") });
  if ((await tool.getAttribute("open")) === null)
    await tool.locator(":scope > summary").click();
  return tool;
}

test("create is OFF; only explicit state buttons enable/disable and preserve selected context", async ({
  page,
}) => {
  await setup(page);
  let saved = false,
    current = row();
  const posts: { path: string; body: unknown }[] = [];
  await page.route("**/api/v1/monitoring/url-schedules**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      posts.push({ path, body });
      if (path === base) {
        saved = true;
        current = {
          ...current,
          name: body.name,
          interval_minutes: body.interval_minutes,
        };
      } else {
        expect(body.expected_revision).toBe(current.revision);
        current = {
          ...current,
          revision: current.revision + 1,
          enabled: body.enabled,
          next_run_at: body.enabled ? "2026-10-20T12:00:00Z" : null,
        };
      }
      await route.fulfill({ json: current });
      return;
    }
    await route.fulfill({
      json: path.endsWith("/runs")
        ? { items: [], total: 0, page: 1, page_size: 10 }
        : path.endsWith(id)
          ? current
          : {
              items: saved ? [current] : [],
              total: saved ? 1 : 0,
              page: 1,
              page_size: 10,
              source_interval_seconds: 300,
              source_hourly_limit: 12,
            },
    });
  });
  const tool = await open(page);
  await tool
    .locator("summary")
    .filter({ hasText: /^Добавить расписание$/ })
    .click();
  await tool
    .getByLabel("Название расписания", { exact: true })
    .fill(current.name);
  await tool.getByRole("spinbutton").fill("60");
  expect(posts).toHaveLength(0);
  await tool
    .getByRole("button", { name: "Создать выключенное расписание" })
    .click();
  await expect(
    tool.getByRole("button", { name: "Включить расписание", exact: true }),
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(current.enabled).toBe(false);
  await expect(page).toHaveURL(/candidate_id=11111111/);
  await expect(page).toHaveURL(/q=retained/);
  await tool
    .getByRole("button", { name: "Включить расписание", exact: true })
    .click();
  await expect(
    tool.getByRole("button", { name: "Выключить расписание", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    tool.getByRole("button", { name: "Выключить расписание", exact: true }),
  ).toBeVisible();
  expect(posts).toHaveLength(2);
  await tool
    .getByRole("button", { name: "Выключить расписание", exact: true })
    .click();
  await expect(
    tool.getByRole("button", { name: "Включить расписание", exact: true }),
  ).toBeVisible();
  expect(posts).toHaveLength(3);
  expect(posts.map((p) => p.path)).toEqual([
    base,
    `${base}/${id}/state`,
    `${base}/${id}/state`,
  ]);
});

test("draft and retry key survive reload; conflict and GET refresh preserve input", async ({
  page,
}) => {
  await setup(page);
  let current = row(),
    attempts = 0;
  const keys: string[] = [];
  await page.route("**/api/v1/monitoring/url-schedules**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      attempts++;
      if (attempts !== 2) {
        await route.fulfill({
          status: attempts === 1 ? 503 : 409,
          json: {
            error: {
              message:
                attempts === 1 ? "DEMO временная ошибка" : "DEMO конфликт",
            },
          },
        });
        return;
      }
      const body = route.request().postDataJSON();
      current = { ...current, name: body.name, revision: 2 };
      await route.fulfill({ json: current });
      return;
    }
    await route.fulfill({
      json: path.endsWith("/runs")
        ? { items: [], total: 0, page: 1, page_size: 10 }
        : path.endsWith(id)
          ? current
          : {
              items: [current],
              total: 1,
              page: 1,
              page_size: 10,
              source_interval_seconds: 300,
              source_hourly_limit: 12,
            },
    });
  });
  const tool = await open(page, `&schedule_id=${id}`);
  await tool
    .getByLabel("Сохранённое название", { exact: true })
    .fill("DEMO черновик Әділет");
  await expect(
    tool.getByRole("button", { name: "Включить расписание", exact: true }),
  ).toBeDisabled();
  await tool
    .getByRole("button", { name: "Сохранить настройки", exact: true })
    .click();
  await expect(
    tool.getByRole("alert").filter({ hasText: "DEMO временная ошибка" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    tool.getByLabel("Сохранённое название", { exact: true }),
  ).toHaveValue("DEMO черновик Әділет");
  await tool
    .getByRole("button", { name: "Сохранить настройки", exact: true })
    .click();
  await expect(tool).toContainText("Сохранено. Состояние обновлено.");
  expect(keys[0]).toBe(keys[1]);
  await tool
    .getByLabel("Сохранённое название", { exact: true })
    .fill("DEMO конфликтный ввод");
  await tool
    .getByRole("button", { name: "Сохранить настройки", exact: true })
    .click();
  await expect(
    tool.getByRole("alert").filter({ hasText: "DEMO конфликт" }),
  ).toBeVisible();
  await tool
    .getByRole("button", { name: "Обновить выбранное расписание" })
    .click();
  await expect(
    tool.getByLabel("Сохранённое название", { exact: true }),
  ).toHaveValue("DEMO конфликтный ввод");
  expect(keys).toHaveLength(3);
  expect(keys[2]).not.toBe(keys[1]);
});

test("history and settings are responsive RU/KZ; viewer cannot mutate", async ({
  page,
}) => {
  await setup(page, "viewer");
  const current = {
    ...row(),
    name: "DEMO Өскемен тұрғын үй кешені ".repeat(3),
    url: "https://primeminister.kz/ru/news/" + "a".repeat(180),
  };
  await page.route("**/api/v1/monitoring/url-schedules**", async (route) => {
    expect(route.request().method()).toBe("GET");
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      json: path.endsWith("/runs")
        ? {
            items: [
              {
                id,
                configuration: current,
                created_at: "2026-10-19T12:00:00Z",
                state: "DEFERRED",
                reason: "SOURCE_QUOTA",
                advertisement_id: null,
                reused_job: false,
              },
            ],
            total: 1,
            page: 1,
            page_size: 10,
          }
        : path.endsWith(id)
          ? current
          : {
              items: [current],
              total: 1,
              page: 1,
              page_size: 10,
              source_interval_seconds: 300,
              source_hourly_limit: 12,
            },
    });
  });
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  for (const locale of ["ru", "kk"]) {
    await page.addInitScript(
      (l) => localStorage.setItem("saq-locale", l),
      locale,
    );
    const tool = await open(page, `&schedule_id=${id}`);
    await expect(tool.locator("tbody").last()).toContainText(
      locale === "ru" ? "Пауза по лимиту" : "Дереккөз лимиті",
    );
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      if (width === 375 || width === 1440)
        await tool.screenshot({
          path: `../.local/open-source-20261019/schedules-viewer-${locale}-${width}.png`,
        });
    }
    await expect(tool.getByRole("textbox")).toHaveCount(0);
  }
  expect(posts).toEqual([]);
});

test("read failure retries GET only; invalid selected ID never becomes a detail request", async ({
  page,
}) => {
  await setup(page);
  let reads = 0;
  await page.route("**/api/v1/monitoring/url-schedules**", async (route) => {
    expect(new URL(route.request().url()).pathname).toBe(base);
    expect(route.request().method()).toBe("GET");
    reads++;
    await route.fulfill(
      reads === 1
        ? {
            status: 503,
            json: { error: { message: "DEMO чтение недоступно" } },
          }
        : {
            json: {
              items: [],
              total: 0,
              page: 1,
              page_size: 10,
              source_interval_seconds: 300,
              source_hourly_limit: 12,
            },
          },
    );
  });
  const tool = await open(page, "&schedule_id=invalid");
  await expect(tool).toContainText("DEMO чтение недоступно");
  await tool
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(tool).toContainText("Расписаний пока нет.");
  await expect(tool).toContainText("Некорректный ID расписания");
  expect(reads).toBe(2);
});

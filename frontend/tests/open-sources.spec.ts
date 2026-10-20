import { expect, test, type Page } from "@playwright/test";
import { openMonitoringTool, login, testOrigin } from "./support";

const objectId = "11111111-1111-4111-8111-111111111111";
const jobIds = [
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
function importJob(id: string, state = "SUCCEEDED") {
  return {
    id,
    kind: "IMPORT_URL",
    state,
    stage: state === "RUNNING" ? "Загрузка публикации" : "Публикация сохранена",
    attempt: 1,
    error: null,
    advertisement_id: state === "SUCCEEDED" ? objectId : null,
  };
}

test("register upload passes proxy's JSON limit but still validates PDF bytes", async ({
  page,
}) => {
  await login(page);
  const csrf = (await (await page.request.get("/api/v1/auth/csrf")).json())
    .csrf_token;
  const response = await page.request.post("/api/v1/monitoring/open-registry", {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    multipart: {
      source_url: "https://khc.kz/upload/example.pdf",
      file: {
        name: "malformed.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.alloc(600_000, 65),
      },
    },
  });
  expect(response.status()).toBe(415);
});
const user = {
  id: objectId,
  username: "presentation",
  display_name: "Проверка интерфейса",
  role: "analyst",
};
const articleUrl =
  "https://primeminister.kz/ru/news/zhilishchnaya-programma-123";
test("commercial page import waits for explicit submit and retains URL context", async ({
  page,
}) => {
  await auth(page);
  const posts: string[] = [];
  await page.route("**/api/v1/advertisements/import-url", async (route) => {
    posts.push(route.request().method());
    expect(route.request().postDataJSON()).toEqual({
      url: "https://www.angroups.kz/payment",
      is_demo: false,
    });
    await route.fulfill({ status: 202, json: importJob(jobIds[0], "RUNNING") });
  });
  await page.route(`**/api/v1/analysis-jobs/${jobIds[0]}`, (route) =>
    route.fulfill({ json: importJob(jobIds[0]) }),
  );
  await page.goto("/advertisements/import-url?q=retained");
  await expect(
    page.getByRole("heading", { name: "Поддерживаемые страницы" }),
  ).toBeVisible();
  await expect(
    page.getByText(/текст настольной версии может отличаться/),
  ).toBeVisible();
  await page
    .getByLabel("Ссылка на публикацию")
    .fill("https://www.angroups.kz/payment");
  expect(posts).toEqual([]);
  await page
    .getByRole("button", { name: "Сохранить публикацию", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Открыть сохранённую публикацию" }),
  ).toHaveAttribute("href", `/advertisements/${objectId}`);
  expect(posts).toEqual(["POST"]);
  await expect(page).toHaveURL(/q=retained/);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Открыть сохранённую публикацию" }),
  ).toBeVisible();
  expect(posts).toEqual(["POST"]);
});
async function auth(page: Page, role = "analyst") {
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...user, role } }),
  );
  await page.route("**/api/v1/auth/csrf", (route) =>
    route.fulfill({ json: { csrf_token: "presentation-csrf" } }),
  );
}
for (const [publisher, sourceUrl, licensed] of [
  ["AN GROUPS", "https://www.angroups.kz/payment", false],
  ["Primeminister.kz", articleUrl, true],
] as const) {
  test(`HTML attribution belongs to ${publisher} only`, async ({ page }) => {
    await auth(page);
    await page.route(`**/api/v1/advertisements/${objectId}`, (route) =>
      route.fulfill({
        json: {
          id: objectId,
          revision: 1,
          source_label: `DEMO ${publisher}`,
          source_url: sourceUrl,
          captured_at: "2026-10-19T12:00:00Z",
          published_at: null,
          original_text: "DEMO исходный текст",
          is_demo: true,
          status: "NEW",
          confirmed_property_id: null,
          assets: [
            {
              id: objectId,
              kind: "HTML",
              mime_type: "text/html",
              byte_size: 100,
              sha256: "a".repeat(64),
              is_demo: true,
            },
          ],
        },
      }),
    );
    for (const locale of ["ru", "kk"]) {
      await page.addInitScript(
        (l) => localStorage.setItem("saq-locale", l),
        locale,
      );
      await page.goto(`/advertisements/${objectId}`);
      const original = page.locator(".publication-original");
      await expect(original).toContainText("DEMO исходный текст");
      if (licensed) await expect(original).toContainText("CC BY 4.0");
      else {
        await expect(original).not.toContainText("CC BY");
        await expect(original).not.toContainText("Primeminister.kz");
      }
    }
  });
}
const registry = {
  id: objectId,
  asset_id: objectId,
  as_of: "2026-10-02",
  page_count: 12,
  sha256: "a".repeat(64),
  publisher: "КЖК",
  original_url: `/api/v1/assets/${objectId}`,
  source_url: "https://khc.kz/upload/example.pdf",
  provenance_notice: "Файл загружен аналитиком.",
  limitations:
    "Отсутствие совпадения не доказывает отсутствие основания и не меняет риск.",
};
async function registryPage(page: Page, role = "analyst") {
  await auth(page, role);
  await page.route(/\/api\/v1\/monitoring\/open-registry\?/, (route) =>
    route.fulfill({
      json: { items: [registry], page: 1, page_size: 100, total: 1 },
    }),
  );
  await page.route(
    /\/api\/v1\/monitoring\/(candidates|incidents|registry-snapshots)\?/,
    (route) =>
      route.fulfill({
        json: { items: [], page: 1, page_size: 25, total: 0 },
      }),
  );
  await page.route("**/api/v1/monitoring/threads/status", (route) =>
    route.fulfill({
      json: { state: "DISABLED", message: "Поиск отключён", checked_at: null },
    }),
  );
}

test("licensed import polls and a new completed intent gets a fresh key", async ({
  page,
}) => {
  await auth(page);
  const keys: string[] = [];
  await page.route("**/api/v1/advertisements/import-url", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    expect(route.request().postDataJSON()).toEqual({
      url: articleUrl,
      is_demo: false,
    });
    await route.fulfill({
      status: 202,
      json: {
        id: jobIds[keys.length - 1],
        kind: "IMPORT_URL",
        state: "QUEUED",
        stage: "Ожидает загрузки",
        attempt: 0,
        error: null,
        advertisement_id: null,
      },
    });
  });
  await page.route("**/api/v1/analysis-jobs/*", (route) =>
    route.fulfill({
      json: {
        id: route.request().url().split("/").at(-1),
        kind: "IMPORT_URL",
        state: "SUCCEEDED",
        stage: "Публикация сохранена",
        attempt: 1,
        error: null,
        advertisement_id: objectId,
      },
    }),
  );
  await page.goto("/advertisements/import-url");
  await page
    .getByLabel("Ссылка на публикацию", { exact: true })
    .fill(articleUrl);
  await page
    .getByRole("button", { name: "Сохранить публикацию", exact: true })
    .click();
  const result = page.getByRole("region", {
    name: "Результат импорта",
    exact: true,
  });
  await expect(
    result.getByRole("link", { name: "Открыть сохранённую публикацию" }),
  ).toHaveAttribute("href", `/advertisements/${objectId}`);
  await expect(result).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`job=${jobIds[0]}`));
  await page
    .getByRole("button", { name: "Сохранить публикацию", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`job=${jobIds[1]}`));
  await expect(
    result.getByText("Публикация сохранена", { exact: true }),
  ).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe(keys[1]);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/open-sources/import-${width}.png`,
      fullPage: true,
    });
  }
});

test("failed import keeps URL and explicit retry recovers", async ({
  page,
}) => {
  await auth(page);
  let count = 0;
  await page.route("**/api/v1/advertisements/import-url", (route) =>
    route.fulfill({
      status: 202,
      json: {
        id: jobIds[count++],
        kind: "IMPORT_URL",
        state: "QUEUED",
        stage: "Ожидание",
        attempt: 0,
        error: null,
        advertisement_id: null,
      },
    }),
  );
  await page.route("**/api/v1/analysis-jobs/*", (route) =>
    route.fulfill({
      json: {
        id: jobIds[count - 1],
        kind: "IMPORT_URL",
        state: count === 1 ? "FAILED" : "SUCCEEDED",
        attempt: 1,
        stage: count === 1 ? "Импорт не выполнен" : "Публикация сохранена",
        error:
          count === 1
            ? { error: { message: "Источник временно недоступен" } }
            : null,
        advertisement_id: count === 1 ? null : objectId,
      },
    }),
  );
  await page.goto("/advertisements/import-url");
  await page
    .getByLabel("Ссылка на публикацию", { exact: true })
    .fill(articleUrl);
  await page
    .getByRole("button", { name: "Сохранить публикацию", exact: true })
    .click();
  await expect(page.locator(".notice.error[role=alert]")).toContainText(
    "Источник временно недоступен",
  );
  await expect(
    page.getByLabel("Ссылка на публикацию", { exact: true }),
  ).toHaveValue(articleUrl);
  await page
    .getByRole("button", { name: "Повторить импорт", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Открыть сохранённую публикацию" }),
  ).toBeVisible();
  await expect(page.locator(".notice.error[role=alert]")).toHaveCount(0);
});

test("import job reload resumes polling without any command", async ({
  page,
}) => {
  await auth(page);
  let reads = 0;
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.route(`**/api/v1/analysis-jobs/${jobIds[0]}`, (route) =>
    route.fulfill({
      json: importJob(jobIds[0], ++reads < 3 ? "RUNNING" : "SUCCEEDED"),
    }),
  );
  await page.goto(
    `/advertisements/import-url?job=${jobIds[0]}&context=retained`,
  );
  await expect(
    page.getByText("Загрузка публикации", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Открыть сохранённую публикацию" }),
  ).toHaveAttribute("href", `/advertisements/${objectId}`);
  await expect(
    page.getByRole("region", { name: "Результат импорта" }),
  ).toBeFocused();
  expect(reads).toBeGreaterThanOrEqual(3);
  expect(posts).toEqual([]);
  await page.getByRole("button", { name: "Новый импорт", exact: true }).click();
  await expect(page).toHaveURL(
    /\/advertisements\/import-url\?context=retained$/,
  );
  await expect(
    page.getByRole("region", { name: "Результат импорта" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Ссылка на публикацию", { exact: true }),
  ).toBeEnabled();
});

test("invalid job links make no request and missing job retry only reads status", async ({
  page,
}) => {
  await auth(page);
  let reads = 0;
  let recovered = false;
  let posts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") posts++;
  });
  await page.route("**/api/v1/analysis-jobs/*", (route) => {
    reads++;
    return route.fulfill(
      !recovered
        ? { status: 404, json: { error: { message: "Задание не найдено" } } }
        : { json: importJob(jobIds[0]) },
    );
  });
  for (const query of [
    "job=",
    `job=${"x".repeat(80)}`,
    `job=${jobIds[0]}&job=${jobIds[1]}`,
  ]) {
    await page.goto(`/advertisements/import-url?${query}`);
    await expect(page.locator(".notice.error[role=alert]")).toContainText(
      "некорректный идентификатор",
    );
  }
  expect(reads).toBe(0);
  await page.goto(`/advertisements/import-url?job=${jobIds[0]}`);
  await expect(page.locator(".notice.error[role=alert]")).toContainText(
    "Задание не найдено",
  );
  await expect(
    page.getByRole("button", { name: "Сохранить публикацию", exact: true }),
  ).toBeDisabled();
  const readsBeforeRetry = reads;
  recovered = true;
  await page
    .getByRole("button", { name: "Проверить состояние снова", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Открыть сохранённую публикацию" }),
  ).toBeVisible();
  expect(reads).toBe(readsBeforeRetry + 1);
  expect(posts).toBe(0);
});

test("new job selection and browser Back ignore a late status response", async ({
  page,
}) => {
  await auth(page);
  const pending: (() => Promise<void>)[] = [];
  let holdFirstSelection = true;
  const otherAdvertisement = "44444444-4444-4444-8444-444444444444";
  await page.route(`**/api/v1/analysis-jobs/${jobIds[0]}`, async (route) => {
    // Dev StrictMode may read the same selection twice; delay every such read.
    if (holdFirstSelection) {
      await new Promise<void>((resolve) => {
        pending.push(async () => {
          await route.fulfill({ json: importJob(jobIds[0]) });
          resolve();
        });
      });
    } else await route.fulfill({ json: importJob(jobIds[0]) });
  });
  await page.route(`**/api/v1/analysis-jobs/${jobIds[1]}`, (route) =>
    route.fulfill({
      json: { ...importJob(jobIds[1]), advertisement_id: otherAdvertisement },
    }),
  );
  await page.goto(`/advertisements/import-url?job=${jobIds[0]}`);
  await expect.poll(() => pending.length).toBeGreaterThan(0);
  await expect(
    page.getByText("Восстанавливаем состояние импорта…"),
  ).toBeVisible();
  await page.evaluate(
    (id) => window.history.pushState(null, "", `?job=${id}`),
    jobIds[1],
  );
  const link = page.getByRole("link", {
    name: "Открыть сохранённую публикацию",
  });
  await expect(link).toHaveAttribute(
    "href",
    `/advertisements/${otherAdvertisement}`,
  );
  holdFirstSelection = false;
  await Promise.all(pending.map((release) => release()));
  await expect(link).toHaveAttribute(
    "href",
    `/advertisements/${otherAdvertisement}`,
  );
  await page.goBack();
  await expect(link).toHaveAttribute("href", `/advertisements/${objectId}`);
});

test("restored failed job needs a URL before an explicit new import", async ({
  page,
}) => {
  await auth(page);
  let posts = 0;
  await page.route(`**/api/v1/analysis-jobs/${jobIds[0]}`, (route) =>
    route.fulfill({
      json: {
        ...importJob(jobIds[0], "FAILED"),
        stage: "Импорт не выполнен",
        error: { error: { message: "Источник временно недоступен" } },
      },
    }),
  );
  await page.route("**/api/v1/advertisements/import-url", (route) => {
    posts++;
    expect(route.request().postDataJSON()).toEqual({
      url: articleUrl,
      is_demo: false,
    });
    return route.fulfill({ status: 202, json: importJob(jobIds[1], "QUEUED") });
  });
  await page.route(`**/api/v1/analysis-jobs/${jobIds[1]}`, (route) =>
    route.fulfill({ json: importJob(jobIds[1]) }),
  );
  await page.goto(`/advertisements/import-url?job=${jobIds[0]}`);
  const retry = page.getByRole("button", {
    name: "Повторить импорт",
    exact: true,
  });
  await expect(retry).toBeDisabled();
  await expect(
    page.getByText("Чтобы повторить импорт, укажите ссылку на публикацию."),
  ).toBeVisible();
  expect(posts).toBe(0);
  await page
    .getByLabel("Ссылка на публикацию", { exact: true })
    .fill(articleUrl);
  await retry.click();
  await expect(
    page.getByRole("link", { name: "Открыть сохранённую публикацию" }),
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`job=${jobIds[1]}`));
  expect(posts).toBe(1);
});

test("public register explains page matches, unknown absence and viewer access", async ({
  page,
}) => {
  await registryPage(page, "viewer");
  await page.route(
    /\/api\/v1\/monitoring\/open-registry\/search\?/,
    (route) => {
      const query = new URL(route.request().url()).searchParams.get("q");
      return route.fulfill({
        json: {
          document: registry,
          query,
          total: query === "ASYLYM" ? 1 : 0,
          items:
            query === "ASYLYM"
              ? [
                  {
                    page_number: 6,
                    snippet:
                      "МЖК ASYLYM · Өскемен · <script>не исполняется</script>",
                    matched_terms: ["asylym"],
                  },
                ]
              : [],
        },
      });
    },
  );
  await page.goto("/monitoring");
  await openMonitoringTool(page, "open");
  const panel = page.getByRole("region", {
    name: "Открытый реестр гарантий КЖК",
    exact: true,
  });
  await expect(
    panel.getByText("Добавить новую версию PDF", { exact: true }),
  ).toHaveCount(0);
  await panel
    .getByLabel("Название объекта, адрес или номер договора")
    .fill("ASYLYM");
  await panel
    .getByRole("button", { name: "Найти в документе", exact: true })
    .click();
  await expect(
    panel.getByRole("heading", { name: "Найдено страниц: 1" }),
  ).toBeVisible();
  await expect(panel.getByText("МЖК ASYLYM", { exact: false })).toContainText(
    "<script>",
  );
  await expect(panel.locator("script")).toHaveCount(0);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await panel.screenshot({
      path: `../output/open-sources/registry-${width}.png`,
    });
  }
  await panel
    .getByLabel("Название объекта, адрес или номер договора")
    .fill("Нет совпадения");
  await expect(
    panel.getByRole("heading", { name: "Найдено страниц: 1" }),
  ).toHaveCount(0);
  await panel
    .getByRole("button", { name: "Найти в документе", exact: true })
    .click();
  await expect(
    panel.getByRole("heading", { name: "Найдено страниц: 0" }),
  ).toBeVisible();
  await expect(panel).toContainText("отсутствие основания не установлено");
});

test("dossier shows facts, missing evidence and next action without confirming anything", async ({
  page,
}) => {
  await auth(page);
  const detail = {
    property: {
      id: objectId,
      name: "DEMO Әділет",
      city: "Өскемен",
      address: "Учебный адрес",
      stage: "UNKNOWN",
      progress_percent: null,
      latitude: null,
      longitude: null,
      is_demo: true,
      last_reviewed_at: null,
      legal_verification_status: "UNKNOWN",
      developer: { name: "DEMO Компания", bin: null },
      risk: {
        score: 0,
        revision: 1,
        zone: "GREEN",
        confirmed_codes: [],
        unknown_codes: ["R1", "R2"],
        as_of: "2026-10-17T00:00:00Z",
        rules_version: "1",
      },
    },
    factors: [],
    legal_bases: [],
    advertisement_ids: [],
    unknown_information: [],
  };
  await page.route(`**/api/v1/properties/${objectId}`, (route) =>
    route.fulfill({ json: detail }),
  );
  await page.route(`**/api/v1/properties/${objectId}/history*`, (route) =>
    route.fulfill({ json: { items: [], page: 1, page_size: 25, total: 0 } }),
  );
  await page.goto(`/properties/${objectId}`);
  const progress = page.getByRole("region", {
    name: "Ход проверки",
    exact: true,
  });
  for (const label of [
    "Что найдено",
    "Что подтверждено",
    "Чего не хватает",
    "Что сделать дальше",
  ])
    await expect(progress.getByText(label, { exact: true })).toBeVisible();
  await expect(progress).toContainText("Факторы: пока нет");
  await expect(progress).toContainText(
    "Неизвестность не подтверждает нарушение",
  );
  await expect(progress.getByRole("link")).toHaveAttribute(
    "href",
    "/advertisements/new",
  );
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/open-sources/dossier-${width}.png`,
      fullPage: true,
    });
  }
});

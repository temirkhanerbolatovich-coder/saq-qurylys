import { expect, test, type Page } from "@playwright/test";

const dict = "11111111-1111-4111-8111-111111111111";
const profileId = "22222222-2222-4222-8222-222222222222";
const findingId = "33333333-3333-4333-8333-333333333333";
const runId = "44444444-4444-4444-8444-444444444444";
const versionId = "55555555-5555-4555-8555-555555555555";
const observationId = "66666666-6666-4666-8666-666666666666";
const adId = "77777777-7777-4777-8777-777777777777";
const at = "2026-10-20T10:00:00Z";
const pageOf = (items: unknown[], page = 1, total = items.length) => ({
  items,
  page,
  page_size: 10,
  total,
});
const profile = (revision = 1, current = revision) => ({
  id: profileId,
  name: "DEMO Әділет V2",
  revision,
  current_revision: current,
  parameters: {
    dictionary_version: "2.0",
    dictionary_id: dict,
    source_code: "OFFLINE",
    keyword: true,
    hashtag: false,
    language: "both",
    budget: 10,
    max_query_length: 300,
  },
  dictionary_sha256: "a".repeat(64),
  compiled_preview: {
    queries: [
      {
        id: "b".repeat(64),
        text: "Өскемен DEMO ЖК алғашқы жарна",
        discovery: "keyword",
        capability_status: "LOCAL_FILTER_ONLY",
      },
    ],
    omitted_queries: [],
  },
});
const finding = (version = 1) => ({
  id: findingId,
  version_id:
    version === 1 ? versionId : "88888888-8888-4888-8888-888888888888",
  version,
  external_id: "DEMO-source",
  is_demo: true,
  source_url: "https://www.threads.net/@demo/post/fixture",
  published_at: null,
  captured_at: at,
  dictionary_sha256: "a".repeat(64),
  content_sha256: "c".repeat(64),
  rules_version: "social-context-0.1",
  media_type: "VIDEO",
  priority: "P1",
  advertisement_id: null,
  text:
    version === 1
      ? "DEMO Өскемен ЖК «Әділет». Оплатите бронь 200 000 ₸ до сдачи."
      : "DEMO другая версия, без брони.",
  context: {
    priority_reason: "AFFIRMATIVE_PAYMENT_REQUIRES_REVIEW",
    content_limits: ["TEXT_ONLY", "VIDEO_NOT_ANALYZED"],
    matched_spans: [{ kind: "payment", text: "бронь", start: 34, end: 39 }],
  },
});

async function setup(page: Page, role = "analyst") {
  page.on("pageerror", (error) => {
    throw error;
  });
  const posts: { path: string; key: string; body: Record<string, unknown> }[] =
    [];
  const gets: string[] = [];
  let imported = false;
  let failImport = false;
  let activeRevision = 1;
  await page.route("**/api/v1/auth/me", (r) =>
    r.fulfill({
      json: { id: dict, username: "presentation", display_name: "DEMO", role },
    }),
  );
  await page.route("**/api/v1/auth/csrf", (r) =>
    r.fulfill({ json: { csrf_token: "presentation" } }),
  );
  await page.route("**/api/v1/monitoring/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace("/api/v1", "");
    if (request.method() === "POST") {
      posts.push({
        path,
        key: request.headers()["idempotency-key"],
        body: request.postDataJSON(),
      });
      if (path.endsWith("/imports")) {
        if (failImport) {
          failImport = false;
          return route.fulfill({
            status: 503,
            json: {
              error: { message: "DEMO ответ потерян. Повторите явный импорт." },
            },
          });
        }
        imported = true;
        return route.fulfill({ status: 201, json: { advertisement_id: adId } });
      }
      if (path.endsWith("/capture"))
        return route.fulfill({
          json: { outcome: "PARTIAL", new_findings: 1, new_versions: 1 },
        });
      if (path.endsWith("/runs"))
        return route.fulfill({ json: { run_id: runId } });
      if (path.endsWith("/activations")) {
        activeRevision++;
        return route.fulfill({
          json: {
            revision: activeRevision,
            dictionary_id: request.postDataJSON().dictionary_id,
          },
        });
      }
      if (path.endsWith("/dictionaries"))
        return route.fulfill({ status: 201, json: { id: dict } });
      if (path.includes("/query-profiles"))
        return route.fulfill({
          status: 201,
          json: profile(path.endsWith("/versions") ? 2 : 1),
        });
      throw new Error(`Unexpected monitoring command: ${path}`);
    }
    gets.push(url.pathname + url.search);
    if (path.endsWith("/dictionaries/bundled"))
      return route.fulfill({
        json: { dictionary_version: "2.0", content_sha256: "a".repeat(64) },
      });
    if (path.endsWith("/dictionaries/activation"))
      return route.fulfill({
        json: { revision: activeRevision, dictionary_id: dict },
      });
    if (path.endsWith("/dictionaries/activations"))
      return route.fulfill({
        json: pageOf([
          {
            revision: activeRevision,
            dictionary_id: dict,
            reason: "DEMO activate",
            created_at: at,
          },
        ]),
      });
    if (path.endsWith("/dictionaries"))
      return route.fulfill({
        json: pageOf([
          {
            id: dict,
            dictionary_version: "2.0",
            content_sha256: "a".repeat(64),
            created_at: at,
          },
        ]),
      });
    if (path.endsWith("/query-profiles"))
      return route.fulfill({ json: pageOf([profile()]) });
    if (path === `/monitoring/query-profiles/${profileId}`)
      return route.fulfill({
        json:
          url.searchParams.get("dictionary_version") === "2.0"
            ? profile(Number(url.searchParams.get("revision") || 2), 2)
            : {
                ...profile(),
                compiled_queries: ["DEMO legacy"],
                parameters: {
                  dictionary_version: "1.0",
                  city: "Өскемен",
                  language: "ru",
                  topic: "payment",
                  project: "DEMO",
                },
              },
      });
    if (path.endsWith("/threads/status"))
      return route.fulfill({
        json: {
          state: "CONFIGURED_UNVERIFIED",
          busy: false,
          retry_after_seconds: 0,
        },
      });
    if (path === `/monitoring/runs/${runId}`)
      return route.fulfill({
        json: {
          state: "SUCCEEDED",
          query: { query: "DEMO Өскемен", profile_version_id: profileId },
          returned_count: 1,
          result: { has_more: true },
        },
      });
    if (path.endsWith("/findings"))
      return route.fulfill({
        json: pageOf([
          { ...finding(), advertisement_id: imported ? adId : null },
        ]),
      });
    if (path.endsWith("/observations"))
      return route.fulfill({
        json: pageOf([
          {
            id: observationId,
            version_id: url.searchParams.get("version_id"),
            run_id: runId,
            profile_version_id: profileId,
            query_id: "b".repeat(64),
            captured_at: at,
            has_more: true,
            raw_response_sha256: "d".repeat(64),
          },
        ]),
      });
    if (path === `/monitoring/findings/${findingId}/versions`)
      return route.fulfill({ json: pageOf([finding(2), finding(1)]) });
    if (path === `/monitoring/findings/${findingId}`)
      return route.fulfill({
        json: {
          ...finding(Number(url.searchParams.get("version") || 2)),
          advertisement_id: imported ? adId : null,
        },
      });
    return route.fallback();
  });
  return {
    posts,
    gets,
    failNextImport() {
      failImport = true;
    },
  };
}
async function open(page: Page, extra = "") {
  await page.goto(
    `/monitoring?section=v2&q=retained&candidate_id=${dict}&query_profile_id=${profileId}${extra}`,
  );
  await expect(
    page.getByRole("heading", { name: "Parser V2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Находки V2", exact: true }),
  ).toBeVisible();
}

test("V2 reads, tabs, Enter and history preserve existing IDs without commands", async ({
  page,
}) => {
  const state = await setup(page);
  await open(page, `&v2_profile_id=${profileId}&v2_profile_revision=1`);
  const selected = page.getByRole("region", {
    name: "Выбранный профиль V2",
    exact: true,
  });
  await expect(selected).toContainText("Версия 1 / 2");
  await selected.getByLabel("Причина поиска V2").fill("DEMO unsent reason");
  await selected.getByLabel("Причина поиска V2").press("Enter");
  await expect(
    selected.getByRole("button", { name: "Выполнить один поиск V2" }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Кандидаты", exact: true }).click();
  await page.getByRole("tab", { name: "Parser V2", exact: true }).click();
  await expect(selected.getByLabel("Причина поиска V2")).toHaveValue(
    /DEMO unsent reason/,
  );
  await page.reload();
  await expect(selected.getByLabel("Причина поиска V2")).toHaveValue(
    /DEMO unsent reason/,
  );
  await expect(page).toHaveURL(/q=retained/);
  expect(new URL(page.url()).searchParams.get("query_profile_id")).toBe(
    profileId,
  );
  expect(new URL(page.url()).searchParams.get("candidate_id")).toBe(dict);
  expect(state.posts).toEqual([]);
});

test("dictionary registration and activation are explicit separate commands", async ({
  page,
}) => {
  const state = await setup(page);
  await open(page);
  await page.getByText("Словарь V2 и активация", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Сохранить поставляемый словарь" }),
  ).toBeDisabled();
  await page
    .getByLabel("Причина изменения словаря")
    .fill("DEMO dictionary decision");
  await page
    .getByRole("button", { name: "Сохранить поставляемый словарь" })
    .click();
  await expect(
    page.getByText(
      "Словарь сохранён. Для новых профилей нужна отдельная активация.",
    ),
  ).toBeVisible();
  expect(state.posts.map((p) => p.path)).toEqual(["/monitoring/dictionaries"]);
  await page
    .getByRole("button", { name: "Активировать выбранный словарь" })
    .click();
  await expect.poll(() => state.posts.length).toBe(2);
  expect(state.posts[1].body).toEqual({
    dictionary_id: dict,
    expected_revision: 1,
    reason: "DEMO dictionary decision",
  });
  await page.getByText("История активаций", { exact: true }).click();
  await expect(page.getByText("DEMO activate", { exact: false })).toBeVisible();
});

test("profile save, single query run and capture are three separate intents", async ({
  page,
}) => {
  const state = await setup(page);
  await open(page);
  await page.getByText("Параметры нового профиля", { exact: true }).click();
  await page
    .getByLabel("Название профиля V2", { exact: true })
    .fill("DEMO Әділет V2");
  await page
    .getByRole("button", { name: "Сохранить профиль V2", exact: true })
    .click();
  await expect(page).toHaveURL(/v2_profile_revision=1/);
  expect(state.posts.map((p) => p.path)).toEqual([
    "/monitoring/query-profiles",
  ]);
  const selected = page.getByRole("region", {
    name: "Выбранный профиль V2",
    exact: true,
  });
  await selected
    .getByRole("button", { name: "Текущая версия V2", exact: true })
    .click();
  await expect(selected).toContainText("Версия 2 / 2");
  await selected
    .getByLabel("Сохранённая фраза V2")
    .selectOption("b".repeat(64));
  await selected.getByLabel("Причина поиска V2").fill("DEMO explicit search");
  await selected
    .getByRole("button", { name: "Выполнить один поиск V2", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`v2_run_id=${runId}`));
  expect(state.posts).toHaveLength(2);
  const saved = page.getByRole("region", {
    name: "Сохранённый запуск V2",
    exact: true,
  });
  await expect(saved).toContainText("PARTIAL");
  await saved
    .getByLabel("Причина сохранения находок")
    .fill("DEMO capture page");
  await saved
    .getByRole("button", { name: "Сохранить находки из запуска" })
    .click();
  await expect(saved).toContainText("Страница обработана: PARTIAL");
  expect(state.posts.map((p) => p.path)).toEqual([
    "/monitoring/query-profiles",
    `/monitoring/query-profiles/${profileId}/runs`,
    "/monitoring/findings/capture",
  ]);
  expect(state.posts[1].body).toMatchObject({
    expected_revision: 2,
    query_id: "b".repeat(64),
  });
  expect(state.posts[2].body).toEqual({
    run_id: runId,
    reason: "DEMO capture page",
  });
});

test("exact historical version import requires a fresh acknowledgement; retry reuses key", async ({
  page,
}) => {
  const state = await setup(page);
  state.failNextImport();
  await open(page, `&v2_finding_id=${findingId}&v2_finding_version=1`);
  const selected = page.getByRole("region", {
    name: "Выбранная находка V2",
    exact: true,
  });
  await expect(selected).toContainText(finding().text);
  await expect(selected).toContainText("видео и аудио не скачивались");
  await selected
    .getByLabel("Наблюдение для импорта")
    .selectOption(observationId);
  await selected
    .getByLabel("Причина импорта находки")
    .fill("DEMO preserve historical text");
  const ack = selected.getByRole("checkbox");
  await ack.check();
  await page.reload();
  await expect(ack).not.toBeChecked();
  await expect(selected.getByLabel("Причина импорта находки")).toHaveValue(
    "DEMO preserve historical text",
  );
  await selected
    .getByLabel("Наблюдение для импорта")
    .selectOption(observationId);
  await ack.check();
  const submit = selected.getByRole("button", {
    name: "Импортировать текст этой версии",
    exact: true,
  });
  await submit.click();
  await expect(selected.getByRole("alert")).toContainText("DEMO ответ потерян");
  await submit.click();
  await expect(
    selected.getByRole("link", { name: "Продолжить проверку материала" }),
  ).toHaveAttribute("href", `/advertisements/${adId}`);
  expect(state.posts).toHaveLength(2);
  expect(state.posts[0].key).toBe(state.posts[1].key);
  expect(state.posts[1].body).toEqual({
    version_id: versionId,
    observation_id: observationId,
    reason: "DEMO preserve historical text",
    text_only_acknowledged: true,
  });
});

test("switching finding versions clears acknowledgement and blocks stale content during GET", async ({
  page,
}) => {
  const state = await setup(page);
  await open(page, `&v2_finding_id=${findingId}&v2_finding_version=1`);
  const selected = page.getByRole("region", {
    name: "Выбранная находка V2",
    exact: true,
  });
  await selected.getByRole("checkbox").check();
  await selected.getByText("История версий находки", { exact: true }).click();
  await page.route(
    `**/api/v1/monitoring/findings/${findingId}?version=2`,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({ json: finding(2) });
    },
  );
  await selected.getByRole("button", { name: /^v2 ·/ }).click();
  await expect(selected).not.toContainText(finding().text);
  await expect(selected).toContainText(finding(2).text);
  await expect(selected.getByRole("checkbox")).not.toBeChecked();
  expect(state.posts).toHaveLength(0);
});

test("viewer reads findings and history without mutation controls", async ({
  page,
}) => {
  const state = await setup(page, "viewer");
  await open(
    page,
    `&v2_profile_id=${profileId}&v2_finding_id=${findingId}&v2_finding_version=1&v2_run_id=${runId}`,
  );
  await expect(
    page.getByRole("region", { name: "Выбранная находка V2", exact: true }),
  ).toContainText(finding().text);
  await expect(
    page.getByRole("button", { name: "Импортировать текст этой версии" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Сохранить находки из запуска" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Выполнить один поиск V2" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Параметры нового профиля", { exact: true }),
  ).toHaveCount(0);
  expect(state.posts).toEqual([]);
});

test("empty text and NOT_RELEVANT remain visible without a usable import", async ({
  page,
}) => {
  const state = await setup(page);
  await page.route(
    `**/api/v1/monitoring/findings/${findingId}?version=1`,
    (r) =>
      r.fulfill({
        json: { ...finding(), text: null, priority: "NOT_RELEVANT" },
      }),
  );
  await open(page, `&v2_finding_id=${findingId}&v2_finding_version=1`);
  const selected = page.getByRole("region", {
    name: "Выбранная находка V2",
    exact: true,
  });
  await expect(selected).toContainText("Предположительно не относится");
  await expect(selected).toContainText(
    "Импорт недоступен без исходного текста.",
  );
  await expect(
    selected.getByRole("button", { name: "Импортировать текст этой версии" }),
  ).toBeDisabled();
  expect(state.posts).toEqual([]);
});

test("priority and import filters are sent to server while retaining selected version", async ({
  page,
}) => {
  const state = await setup(page);
  await open(page, `&v2_finding_id=${findingId}&v2_finding_version=1`);
  await page.getByLabel("Приоритет находок").selectOption("NEEDS_CONTEXT");
  await page
    .getByRole("combobox", { name: "Импорт находок", exact: true })
    .selectOption("false");
  await expect
    .poll(() =>
      state.gets.some(
        (g) =>
          g.includes("priority=NEEDS_CONTEXT") && g.includes("imported=false"),
      ),
    )
    .toBe(true);
  expect(new URL(page.url()).searchParams.get("v2_finding_version")).toBe("1");
  expect(new URL(page.url()).searchParams.get("candidate_id")).toBe(dict);
  expect(state.posts).toEqual([]);
});

test("blocked source cannot start a search and old servers show a recoverable error", async ({
  page,
}) => {
  const state = await setup(page);
  await page.route("**/api/v1/monitoring/threads/status", (r) =>
    r.fulfill({
      json: { state: "DISABLED", busy: false, retry_after_seconds: 0 },
    }),
  );
  await open(page, `&v2_profile_id=${profileId}`);
  const selected = page.getByRole("region", {
    name: "Выбранный профиль V2",
    exact: true,
  });
  await selected
    .getByLabel("Сохранённая фраза V2")
    .selectOption("b".repeat(64));
  await selected.getByLabel("Причина поиска V2").fill("DEMO disabled");
  await expect(
    selected.getByRole("button", { name: "Выполнить один поиск V2" }),
  ).toBeDisabled();
  expect(state.posts).toEqual([]);
  await page.route("**/api/v1/monitoring/dictionaries/bundled", (r) =>
    r.fulfill({ status: 404, json: { error: { message: "DEMO old API" } } }),
  );
  await page.reload();
  await expect(
    page.getByText("V2 требует обновлённого сервера.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("DEMO old API", { exact: true })).toBeVisible();
});

test("profile revision conflict preserves editor input and requires an explicit retry", async ({
  page,
}) => {
  const state = await setup(page);
  await page.route(
    `**/api/v1/monitoring/query-profiles/${profileId}/versions`,
    (r) =>
      r.fulfill({
        status: 409,
        json: {
          error: {
            message: "DEMO профиль изменён. Обновите сохранённую версию.",
          },
        },
      }),
  );
  await open(page, `&v2_profile_id=${profileId}`);
  const selected = page.getByRole("region", {
    name: "Выбранный профиль V2",
    exact: true,
  });
  await selected
    .getByText("Изменить параметры новой версии V2", { exact: true })
    .click();
  await selected
    .getByLabel("Название профиля V2", { exact: true })
    .fill("DEMO unsaved conflict");
  await selected
    .getByRole("button", { name: "Сохранить новую версию V2", exact: true })
    .click();
  await expect(selected.getByRole("alert")).toContainText(
    "DEMO профиль изменён",
  );
  await expect(
    selected.getByLabel("Название профиля V2", { exact: true }),
  ).toHaveValue("DEMO unsaved conflict");
  expect(state.posts).toEqual([]);
  await page.reload();
  await selected
    .getByText("Изменить параметры новой версии V2", { exact: true })
    .click();
  await expect(
    selected.getByLabel("Название профиля V2", { exact: true }),
  ).toHaveValue("DEMO unsaved conflict");
});

test("large untrusted source remains exact text with bounded scrolling and safe links", async ({
  page,
}) => {
  const state = await setup(page);
  const text =
    "DEMO <script>window.badSource = true</script>\n" +
    "Ә Ғ Қ Ң Ө Ұ Ү Һ І ".repeat(2500);
  await page.route(
    `**/api/v1/monitoring/findings/${findingId}?version=1`,
    (r) =>
      r.fulfill({
        json: {
          ...finding(),
          text,
          source_url: "javascript:window.badSource=true",
          priority: "NEEDS_CONTEXT",
          context: {
            ...finding().context,
            priority_reason: "TEXT_LIMIT_EXCEEDED",
            mode: "NOT_ANALYZED",
          },
        },
      }),
  );
  await page.setViewportSize({ width: 375, height: 900 });
  await open(page, `&v2_finding_id=${findingId}&v2_finding_version=1`);
  const selected = page.getByRole("region", {
    name: "Выбранная находка V2",
    exact: true,
  });
  const original = selected.locator("pre.v2-original");
  expect(await original.textContent()).toBe(text);
  expect(
    await original.evaluate((el) => el.scrollHeight > el.clientHeight),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await expect(selected.locator('a[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => "badSource" in window)).toBe(false);
  expect(state.posts).toEqual([]);
});

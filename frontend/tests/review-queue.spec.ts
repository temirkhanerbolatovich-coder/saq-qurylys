import { expect, test, type Page as BrowserPage } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type {
  Advertisement,
  AdvertisementReviewItem,
  AdvertisementReviewPage,
  Extraction,
  PropertyDetail,
} from "../lib/types";
import { login } from "./support";

const uuid = (value: number) =>
  `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
function item(value: number): AdvertisementReviewItem {
  const ad: Advertisement = {
    id: uuid(value),
    revision: 1,
    latest_job_id: null,
    source_label: `DEMO queue source ${value}`,
    source_url: null,
    original_text: "DEMO. Первоначальный взнос 20%.",
    published_at: null,
    captured_at: "2026-10-17T06:00:00Z",
    status: "READY_FOR_REVIEW",
    assets: [],
    is_demo: true,
    confirmed_property_id: null,
  };
  return {
    advertisement: ad,
    advertisement_id: ad.id,
    extraction_id: uuid(value + 100),
    extraction_revision: 1,
    actions: ["REVIEW_HYPOTHESES", "REVIEW_MATCH"],
    pending_hypothesis_ids: [uuid(value + 200)],
    needs_property_match: true,
    payment_hypothesis_ids: [],
    r2_reviews: [],
  };
}
function result(
  items: AdvertisementReviewItem[],
  total = items.length,
  page = 1,
): AdvertisementReviewPage {
  return {
    items,
    total,
    page,
    page_size: 20,
    action_totals: {
      REVIEW_HYPOTHESES: total,
      REVIEW_MATCH: total,
      CREATE_PAYMENT_EVIDENCE: 0,
      REVIEW_R2: 0,
    },
  };
}
function extracted(row: AdvertisementReviewItem): Extraction {
  return {
    id: row.extraction_id,
    revision: 1,
    parent_extraction_id: null,
    pipeline_version: "DEMO presentation fixture",
    original_ocr_text: null,
    analysis_text: row.advertisement.original_text,
    warnings: [],
    created_at: row.advertisement.captured_at,
    hypotheses: [
      {
        id: row.pending_hypothesis_ids[0],
        field: "PAYMENT_TERM",
        review_status: "PENDING",
        reviewed_value: null,
        value: { text: "Первоначальный взнос 20%", money: null, percent: 20 },
        fragment: {
          asset_id: uuid(999),
          text_version_id: row.extraction_id,
          quote: "Первоначальный взнос 20%",
          start_offset: 6,
          end_offset: 28,
          bbox: null,
        },
      },
    ],
  };
}
async function materialFixtures(
  page: BrowserPage,
  rows: AdvertisementReviewItem[],
) {
  await page.route("**/api/v1/advertisements/**", (route) => {
    const url = new URL(route.request().url());
    const [, id, child] =
      url.pathname.match(/\/advertisements\/([^/]+)(?:\/(.*))?$/) || [];
    const row = rows.find((value) => value.advertisement_id === id);
    if (!row) return route.fallback();
    return route.fulfill({
      json:
        child === "extractions"
          ? [extracted(row)]
          : child === "matches"
            ? []
            : row.advertisement,
    });
  });
}

test("derived work queue uses whole-set material counts and preserves selection, drafts and URL pagination", async ({
  page,
}) => {
  await login(page);
  const first = item(1),
    second = item(2);
  await materialFixtures(page, [first, second]);
  const requested: string[] = [];
  await page.route("**/api/v1/advertisements/review-queue?**", (route) => {
    const url = new URL(route.request().url());
    requested.push(url.search);
    const current = Number(url.searchParams.get("page") || 1);
    return route.fulfill({
      json: result([current === 1 ? first : second], 21, current),
    });
  });
  await page.goto("/review?queue=actions");
  const queue = page.getByRole("region", {
    name: "Нерешённые действия материалов",
    exact: true,
  });
  await expect(queue).toContainText("Материалов с нерешёнными действиями: 21");
  await queue
    .locator("summary")
    .filter({ hasText: "Материалы по видам действий" })
    .click();
  await expect(queue).toContainText("Проверить гипотезы: 21");
  await expect(queue).toContainText("Проверить привязку к объекту: 21");
  await expect(queue).toContainText("Эти числа нельзя складывать");
  const hypotheses = queue.getByRole("link", {
    name: "Проверить гипотезы · осталось 1",
    exact: true,
  });
  await hypotheses.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(`[id="review-hypotheses-${first.advertisement_id}"]`),
  ).toBeFocused();
  await expect(page.getByLabel("Версия текста", { exact: true })).toHaveValue(
    first.extraction_id,
  );
  const reason = page.getByLabel("Обоснование проверки", { exact: true });
  await reason.fill("DEMO unsaved queue hypothesis reason");
  await queue
    .getByRole("button", { name: "Следующая страница", exact: true })
    .click();
  await expect(queue).toContainText("Страница 2 из 2");
  await expect(reason).toHaveValue("DEMO unsaved queue hypothesis reason");
  expect(new URL(page.url()).searchParams.get("advertisement_id")).toBe(
    first.advertisement_id,
  );
  await expect(queue).toContainText("больше не иметь нерешённых действий");
  await page.reload();
  await expect(reason).toHaveValue("DEMO unsaved queue hypothesis reason");
  await page
    .getByLabel("Нерешённое действие", { exact: true })
    .selectOption("REVIEW_MATCH");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("page"))
    .toBeNull();
  await expect.poll(() => requested.at(-1)).toContain("action=REVIEW_MATCH");
  await page
    .getByLabel("Режим материалов", { exact: true })
    .selectOption("true");
  await expect.poll(() => requested.at(-1)).toContain("is_demo=true");
  await page.goBack();
  await expect(
    page.getByLabel("Режим материалов", { exact: true }),
  ).toHaveValue("");
  await mkdir("../output/qa/review-queue", { recursive: true });
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const row of await page.locator(".review-provenance > div").all()) {
      expect(
        await row.evaluate(
          (element) =>
            element.getBoundingClientRect().width >=
            element.parentElement!.getBoundingClientRect().width - 2,
        ),
      ).toBe(true);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 375 || width === 1440)
      await page.screenshot({
        path: `../output/qa/review-queue/presentation-${width}.png`,
        fullPage: true,
      });
  }
});

test("pending or failed derived filters do not show stale rows or a false zero and keep direct material accessible", async ({
  page,
}) => {
  await login(page);
  const first = item(3);
  await materialFixtures(page, [first]);
  let mode: "ready" | "pending" | "failed" | "empty" = "ready";
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/v1/advertisements/review-queue?**",
    async (route) => {
      if (mode === "pending") await gate;
      if (mode === "failed")
        return route.fulfill({
          status: 503,
          json: { error: { message: "DEMO очередь временно недоступна" } },
        });
      return route.fulfill({ json: result(mode === "empty" ? [] : [first]) });
    },
  );
  await page.goto(
    `/review?queue=actions&advertisement_id=${first.advertisement_id}`,
  );
  const queue = page.getByRole("region", {
    name: "Нерешённые действия материалов",
    exact: true,
  });
  await expect(queue).toContainText("Материалов с нерешёнными действиями: 1");
  await expect(
    page.getByLabel("Обоснование проверки", { exact: true }),
  ).toBeVisible();
  mode = "pending";
  await page
    .getByLabel("Нерешённое действие", { exact: true })
    .selectOption("REVIEW_MATCH");
  await expect(page).toHaveURL(/action=REVIEW_MATCH/);
  await expect(
    queue.getByRole("status").filter({ hasText: "Загрузка данных" }),
  ).toBeVisible();
  await expect(queue.locator(".review-queue-list li")).toHaveCount(0);
  await expect(queue).not.toContainText(
    "Материалов с нерешёнными действиями: 0",
  );
  await expect(
    page.getByLabel("Обоснование проверки", { exact: true }),
  ).toBeVisible();
  mode = "failed";
  release();
  await expect(queue.getByRole("alert")).toContainText(
    "DEMO очередь временно недоступна",
  );
  await expect(queue).not.toContainText(
    "Материалов с нерешёнными действиями: 0",
  );
  mode = "empty";
  await queue
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(queue).toContainText("Материалов с нерешёнными действиями: 0");
  await expect(queue).toContainText("Это не подтверждает безопасность");
  await expect(
    page.getByLabel("Обоснование проверки", { exact: true }),
  ).toBeVisible();
});

test("historical R2 targets its own object and evidence, retains reason on guard/conflict and reuses an uncertain command key", async ({
  page,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=1")
  ).json();
  const baseline: PropertyDetail = await (
    await page.request.get(`/api/v1/properties/${registry.items[0].id}`)
  ).json();
  const row = item(4),
    oldProperty = uuid(500),
    newProperty = uuid(501),
    factorId = uuid(502),
    evidenceId = uuid(503);
  row.advertisement.confirmed_property_id = newProperty;
  row.actions = ["REVIEW_R2"];
  row.pending_hypothesis_ids = [];
  row.needs_property_match = false;
  row.r2_reviews = [
    {
      property_id: oldProperty,
      factor_id: factorId,
      evidence_ids: [evidenceId],
    },
  ];
  let revision = 1;
  await page.route("**/api/v1/advertisements/review-queue?**", (route) =>
    route.fulfill({ json: result([row]) }),
  );
  await page.route(`**/api/v1/properties/${oldProperty}`, (route) =>
    route.fulfill({
      json: {
        ...baseline,
        property: {
          ...baseline.property,
          id: oldProperty,
          name: "DEMO прежний объект",
        },
        factors: [
          {
            id: factorId,
            code: "R2",
            status: "PENDING",
            weight: 25,
            revision,
            evidence_ids: [evidenceId],
            reason: "DEMO",
            as_of: row.advertisement.captured_at,
          },
        ],
      },
    }),
  );
  const commands: {
    path: string;
    key: string | undefined;
    body: {
      expected_revision: number;
      evidence_ids: string[];
      status: string;
      reason: string;
    };
  }[] = [];
  await page.route(`**/api/v1/risk-factors/${factorId}/review`, (route) => {
    commands.push({
      path: new URL(route.request().url()).pathname,
      key: route.request().headers()["idempotency-key"],
      body: route.request().postDataJSON(),
    });
    const status =
      commands.length === 1
        ? 503
        : commands.length === 2
          ? 422
          : commands.length === 3
            ? 409
            : 200;
    if (status === 409) revision = 2;
    return route.fulfill({
      status,
      json:
        status === 200
          ? {}
          : {
              error: {
                message:
                  status === 503
                    ? "DEMO неизвестен результат команды"
                    : status === 422
                      ? "DEMO устаревшее доказательство"
                      : "DEMO конфликт ревизии",
              },
            },
    });
  });
  await page.goto("/review?queue=actions");
  const summary = page
    .locator("summary")
    .filter({ hasText: `Проверить решение R2 по объекту ${oldProperty}` });
  await summary.focus();
  await page.keyboard.press("Enter");
  const form = page.getByLabel(`Решение R2: ${oldProperty}`, { exact: true });
  await expect(form).toContainText(
    "Исторический R2 относится к прежнему объекту",
  );
  await expect(form.getByRole("link")).toHaveAttribute(
    "href",
    `/properties/${oldProperty}#dossier-factors`,
  );
  const reason = form.getByLabel(
    `Обоснование решения R2 по объекту ${oldProperty}`,
    { exact: true },
  );
  await reason.fill("DEMO проверено прежнее доказательство, сохранить причину");
  const confirm = form.getByRole("button", {
    name: "Подтвердить R2 этого объекта",
    exact: true,
  });
  await confirm.click();
  await expect(form.getByRole("alert")).toContainText("неизвестен результат");
  await confirm.click();
  await expect(form.getByRole("alert")).toContainText(
    "устаревшее доказательство",
  );
  await confirm.click();
  await expect(form.getByRole("alert")).toContainText("конфликт ревизии");
  await expect(form).toContainText("ревизия 2");
  await expect(reason).toHaveValue(
    "DEMO проверено прежнее доказательство, сохранить причину",
  );
  await form
    .getByRole("button", { name: "Отклонить R2 этого объекта", exact: true })
    .click();
  await expect(form.getByRole("status")).toContainText("Решение R2 сохранено");
  expect(commands).toHaveLength(4);
  expect(commands[0].key).toBeTruthy();
  expect(commands[1].key).toBe(commands[0].key);
  expect(commands[2].key).toBe(commands[0].key);
  expect(commands[3].key).not.toBe(commands[0].key);
  for (const value of commands) {
    expect(value.path).toBe(`/api/v1/risk-factors/${factorId}/review`);
    expect(value.body.evidence_ids).toEqual([evidenceId]);
  }
  expect(commands[3].body).toMatchObject({
    expected_revision: 2,
    status: "REJECTED",
  });
  const user = await (await page.request.get("/api/v1/auth/me")).json();
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { ...user, role: "viewer" } }),
  );
  await page.reload();
  await summary.click();
  await expect(form).toContainText("Режим просмотра");
  await expect(
    form.getByRole("button", { name: /R2 этого объекта/ }),
  ).toHaveCount(0);
});

test("an evidence-only R2 task creates a pending factor and still requires a separate human decision", async ({
  page,
}) => {
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?page_size=1")
  ).json();
  const baseline: PropertyDetail = await (
    await page.request.get(`/api/v1/properties/${registry.items[0].id}`)
  ).json();
  const row = item(5),
    propertyId = uuid(510),
    factorId = uuid(511),
    evidenceId = uuid(512);
  row.advertisement.confirmed_property_id = propertyId;
  row.actions = ["REVIEW_R2"];
  row.r2_reviews = [
    { property_id: propertyId, factor_id: null, evidence_ids: [evidenceId] },
  ];
  let created = false;
  const commands: { code: string; evidence_ids: string[]; reason: string }[] =
    [];
  await page.route("**/api/v1/advertisements/review-queue?**", (route) =>
    route.fulfill({
      json: result([
        {
          ...row,
          r2_reviews: [
            { ...row.r2_reviews[0], factor_id: created ? factorId : null },
          ],
        },
      ]),
    }),
  );
  await page.route(`**/api/v1/properties/${propertyId}`, (route) =>
    route.fulfill({
      json: {
        ...baseline,
        property: {
          ...baseline.property,
          id: propertyId,
          name: "DEMO evidence-only object",
        },
        factors: created
          ? [
              {
                id: factorId,
                code: "R2",
                status: "PENDING",
                weight: 25,
                revision: 1,
                evidence_ids: [evidenceId],
                reason: "DEMO",
                as_of: row.advertisement.captured_at,
              },
            ]
          : [],
      },
    }),
  );
  await page.route(
    `**/api/v1/properties/${propertyId}/risk-factors`,
    (route) => {
      commands.push(route.request().postDataJSON());
      created = true;
      return route.fulfill({ status: 201, json: {} });
    },
  );
  await page.goto("/review?queue=actions");
  await page
    .locator("summary")
    .filter({ hasText: `Проверить решение R2 по объекту ${propertyId}` })
    .click();
  const form = page.getByLabel(`Решение R2: ${propertyId}`, { exact: true });
  await expect(form).toContainText("R2 ещё не создан");
  await form
    .getByLabel(`Обоснование решения R2 по объекту ${propertyId}`, {
      exact: true,
    })
    .fill("DEMO доказательство проверено, создать фактор на проверке");
  await form
    .getByRole("button", { name: "Создать R2 на проверке", exact: true })
    .click();
  await expect(form).toContainText("На проверке");
  await expect(
    form.getByRole("button", {
      name: "Подтвердить R2 этого объекта",
      exact: true,
    }),
  ).toBeDisabled();
  expect(commands).toHaveLength(1);
  expect(commands[0]).toMatchObject({ code: "R2", evidence_ids: [evidenceId] });
});

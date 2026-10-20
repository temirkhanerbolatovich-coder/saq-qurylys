import { expect, test, type Page } from "@playwright/test";
import type { AuditEvent } from "../lib/types";
import {
  fixtureProperty,
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

const basisId = "72000000-0000-4000-8000-000000000001";
const reviewerId = "72000000-0000-4000-8000-000000000002";
const sourceLiteral = "DEMO Сохранённый источник · Түпнұсқа Ә Ғ Қ Ң Ө Ұ Ү Һ І";

async function mount(
  page: Page,
  options: {
    locale?: "ru" | "kk";
    viewer?: boolean;
    statuses?: string[];
    sourceFailure?: boolean;
    sourceMissing?: boolean;
    initialFailure?: boolean;
  } = {},
) {
  const fixture = functionalSafetyFixture();
  if (options.viewer) fixture.setActor({ ...fixtureUser, role: "viewer" });
  fixture.detail.factors = (options.statuses || ["PENDING"]).map(
    (status, index) => ({
      id: `72000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
      revision: 1,
      code: `R${index + 1}`,
      status,
      weight: [35, 25, 10, 15, 10, 5][index],
      as_of: "2026-10-20T12:00:00+05:00",
      evidence_ids: [],
      reason: "DEMO сохранённое решение",
      reviewed_by: status === "CONFIRMED" ? reviewerId : null,
      reviewed_at: status === "CONFIRMED" ? "2025-01-01T12:00:00+05:00" : null,
    }),
  );
  fixture.detail.property.risk.unknown_codes = fixture.detail.factors
    .filter((item) => item.status === "PENDING")
    .map((item) => item.code);
  fixture.detail.legal_bases = [
    {
      id: basisId,
      mechanism: "GUARANTEE",
      document_number: "DEMO SQ10 №1",
      document_date: "2020-01-01",
      issuer: sourceLiteral,
      scope_description: "DEMO очередь 1 — сохранённый охват",
      asset_id: "72000000-0000-4000-8000-000000000003",
      is_demo: true,
      revision: 1,
      verification_status: "PENDING",
      applies_from: "2021-01-01T12:00:00+05:00",
      applies_until: "2022-01-01T12:00:00+05:00",
      verification_as_of: null,
      reviewed_at: null,
      reviewed_by: null,
      evidence_ids: ["72000000-0000-4000-8000-000000000004"],
    },
  ];
  const source: AuditEvent = {
    id: "72000000-0000-4000-8000-000000000005",
    actor_id: fixtureUser.id,
    actor_display_name: "DEMO Исторический автор",
    risk_code: null,
    occurred_at: "2010-01-01T12:00:00+05:00",
    action: "SOURCE_PACKAGE_IMPORTED",
    entity_type: "property",
    entity_id: fixtureProperty.id,
    old_revision: null,
    new_revision: 1,
    reason: "DEMO источник старше последних 100 событий",
    details: {
      source_row: {
        official_source: "https://example.invalid/saved-primary",
        notes: sourceLiteral,
        list_date: "2010-01-01",
      },
    },
  };
  const requests: { method: string; path: string; search: string }[] = [];
  let failSource = options.sourceFailure;
  let failDetail = options.initialFailure;
  let failAfterReview = false;
  await page.addInitScript((locale) => {
    localStorage.setItem("saq-locale", locale);
    localStorage.setItem("saq-detailed-interface", "true");
  }, options.locale || "ru");
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push({
      method: request.method(),
      path: url.pathname,
      search: url.search,
    });
    if (url.pathname === `/api/v1/properties/${fixtureProperty.id}/provenance`)
      return route.fulfill(
        failSource
          ? {
              status: 503,
              json: { error: { message: "DEMO Происхождение недоступно" } },
            }
          : { json: options.sourceMissing ? null : source },
      );
    if (
      url.pathname === `/api/v1/properties/${fixtureProperty.id}` &&
      failDetail
    )
      return route.fulfill({
        status: 503,
        json: { error: { message: "DEMO Обновление досье недоступно" } },
      });
    if (url.pathname === `/api/v1/properties/${fixtureProperty.id}/audit`)
      return route.fulfill({
        json: { items: [], total: 150, page: 1, page_size: 10 },
      });
    if (url.pathname === `/api/v1/legal-bases/${basisId}/review`) {
      const body = request.postDataJSON();
      fixture.detail.legal_bases[0] = {
        ...fixture.detail.legal_bases[0],
        revision: 2,
        verification_status: body.status,
        reviewed_by: reviewerId,
        reviewed_at: "2026-10-20T12:00:00+05:00",
      };
      failDetail = failAfterReview;
      return route.fulfill({ json: fixture.detail.legal_bases[0] });
    }
    return route.fulfill(fixture.response(request.method(), url.pathname));
  });
  return {
    fixture,
    requests,
    setSourceFailure(value: boolean) {
      failSource = value;
    },
    setDetailFailure(value: boolean) {
      failDetail = value;
    },
    failRefreshAfterReview() {
      failAfterReview = true;
    },
  };
}

const dossier = `/properties/${fixtureProperty.id}`;
const writes = (requests: { method: string }[]) =>
  requests.filter((request) => request.method !== "GET");
const documentRow = (page: Page) =>
  page.locator("#dossier-bases .dossier-records tbody tr").first();
const drawer = (page: Page) =>
  page.getByRole("dialog").filter({ has: page.locator(".document-review") });

for (const locale of ["ru", "kk"] as const) {
  for (const statuses of [
    [
      "CONFIRMED",
      "CONFIRMED",
      "CONFIRMED",
      "CONFIRMED",
      "CONFIRMED",
      "PENDING",
    ],
    ["CONFIRMED", "PENDING", "REJECTED"],
    [],
  ]) {
    test(`SQ06 six factor groups are exclusive for ${statuses.join("-") || "missing"} in ${locale}`, async ({
      page,
    }) => {
      const { requests } = await mount(page, { locale, statuses });
      await page.goto(`${dossier}?section=review`);
      const counts = page.locator(".risk-statistics-grid strong");
      const expected = ["CONFIRMED", "PENDING", "REJECTED"].map(
        (status) => statuses.filter((item) => item === status).length,
      );
      expected.push(6 - expected.reduce((sum, value) => sum + value, 0));
      await expect(counts).toHaveText(expected.map(String));
      expect(
        (await counts.allTextContents()).reduce(
          (sum, value) => sum + Number(value),
          0,
        ),
      ).toBe(6);
      expect(writes(requests)).toEqual([]);
    });
  }

  test(`SQ07 failed dossier refresh shows prior read time and GET retry preserves forms in ${locale}`, async ({
    page,
  }) => {
    const control = await mount(page, { locale });
    await page.goto(`${dossier}?section=review`);
    const tools = page.locator("#dossier-materials");
    if ((await tools.getAttribute("open")) === null)
      await tools.locator(":scope > summary").click();
    const reason = "DEMO несохранённое решение R4 · Сақталған жоба";
    await page.locator("#appeal-reason").fill(reason);
    await page.locator("#dossier-tab-documents").click();
    await page
      .getByRole("searchbox", {
        name: locale === "ru" ? "Найти документ" : "Құжатты табу",
        exact: true,
      })
      .fill("SQ10");
    await documentRow(page)
      .getByRole("button", { name: /^Открыть документ:|^Құжатты ашу:/ })
      .click();
    await drawer(page)
      .locator(`#basis-review-reason-${basisId}`)
      .fill("DEMO отдельное решение; чтение затем недоступно");
    control.failRefreshAfterReview();
    await drawer(page)
      .getByRole("button", {
        name:
          locale === "ru" ? "Подтвердить применимость" : "Қолданылуын растау",
        exact: true,
      })
      .click();
    await expect(
      drawer(page)
        .getByRole("alert")
        .filter({
          hasText:
            locale === "ru" ? "Не удалось обновить" : "Жаңарту мүмкін болмады",
        }),
    ).toBeVisible();
    await drawer(page)
      .getByRole("button", {
        name:
          locale === "ru"
            ? "Закрыть карточку записи"
            : "Жазба карточкасын жабу",
        exact: true,
      })
      .click();
    const warning = page.getByTestId("dossier-stale-warning");
    await expect(warning).toContainText(
      locale === "ru"
        ? "показаны предыдущие данные на"
        : "алдыңғы мәліметтер уақыты",
    );
    expect(await warning.textContent()).toMatch(/\d{4}/);
    expect(writes(control.requests)).toHaveLength(1);
    control.setDetailFailure(false);
    await warning.getByRole("button").click();
    await expect(warning).toHaveCount(0);
    await expect(page.locator(".document-filters input")).toHaveValue("SQ10");
    await page.locator("#dossier-tab-review").click();
    await expect(page.locator("#appeal-reason")).toHaveValue(reason);
    expect(writes(control.requests)).toHaveLength(1);
  });

  test(`SQ13 direct provenance survives more than 100 unrelated audit events in ${locale}`, async ({
    page,
  }) => {
    const { requests } = await mount(page, { locale });
    await page.goto(dossier);
    const origin = page.locator(".dossier-origin-card");
    await expect(origin).toContainText("2010");
    await expect(
      page.getByRole("link", { name: "example.invalid", exact: true }).first(),
    ).toHaveAttribute("href", "https://example.invalid/saved-primary");
    await expect(page.locator(".dossier-card-grid")).toContainText(
      sourceLiteral,
    );
    expect(
      requests.filter((request) => request.path.endsWith("/provenance")),
    ).toHaveLength(1);
    expect(
      requests.filter(
        (request) =>
          request.path.endsWith("/audit") &&
          request.search.includes("page_size=100"),
      ),
    ).toHaveLength(0);
    expect(writes(requests)).toEqual([]);
  });
}

test("SQ07 initial dossier failure offers retry without presenting stale data", async ({
  page,
}) => {
  const control = await mount(page, { initialFailure: true });
  await page.goto(dossier);
  await expect(page.locator(".notice[role=alert]")).toContainText(
    "DEMO Обновление досье недоступно",
  );
  await expect(page.locator(".dossier-header")).toHaveCount(0);
  await expect(page.getByTestId("dossier-stale-warning")).toHaveCount(0);
  control.setDetailFailure(false);
  await page
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(page.locator(".dossier-header")).toContainText(
    fixtureProperty.name,
  );
  expect(writes(control.requests)).toEqual([]);
});

test("SQ10 canonical document row opens independent review and preserves draft across drawer close and tabs", async ({
  page,
}) => {
  const { requests } = await mount(page);
  await page.goto(`${dossier}?section=documents&history_page=2`);
  await expect(
    page.locator("#dossier-bases .dossier-records tbody tr"),
  ).toHaveCount(1);
  await expect(page.locator(".dossier-document")).toHaveCount(0);
  await expect(documentRow(page)).toContainText("DEMO очередь 1");
  await documentRow(page)
    .getByRole("button", { name: /^Открыть документ:/ })
    .click();
  await expect(drawer(page).locator(".document-review")).toHaveCount(1);
  const reason = "DEMO причина сохраняется после закрытия и смены вкладки";
  await drawer(page).locator(`#basis-review-reason-${basisId}`).fill(reason);
  await drawer(page)
    .getByRole("button", { name: "Закрыть карточку записи", exact: true })
    .click();
  await page.locator("#dossier-tab-overview").click();
  await page.locator("#dossier-tab-documents").click();
  await documentRow(page)
    .getByRole("button", { name: /^Открыть документ:/ })
    .click();
  await expect(
    drawer(page).locator(`#basis-review-reason-${basisId}`),
  ).toHaveValue(reason);
  await drawer(page)
    .getByRole("tab", { name: /^Файлы/ })
    .click();
  await expect(
    drawer(page).getByRole("link", { name: "Скачать сохранённый оригинал" }),
  ).toHaveAttribute(
    "href",
    "/api/v1/assets/72000000-0000-4000-8000-000000000003",
  );
  await drawer(page)
    .getByRole("button", { name: "Закрыть карточку записи", exact: true })
    .click();
  await expect(page).toHaveURL(/history_page=2/);
  expect(writes(requests)).toEqual([]);
});

test("SQ10 legacy document deep link opens its single review drawer without a command", async ({
  page,
}) => {
  const { requests } = await mount(page);
  await page.goto(`${dossier}#dossier-document-${basisId}`);
  await expect(drawer(page)).toBeVisible();
  await expect(
    drawer(page).locator(`#basis-review-reason-${basisId}`),
  ).toBeVisible();
  await expect(page).toHaveURL(/section=documents/);
  expect(writes(requests)).toEqual([]);
});

test("SQ10 viewer reads the selected document without review mutation controls", async ({
  page,
}) => {
  const { requests } = await mount(page, { viewer: true });
  await page.goto(`${dossier}?section=documents`);
  await documentRow(page)
    .getByRole("button", { name: /^Открыть документ:/ })
    .click();
  await expect(drawer(page)).toContainText(sourceLiteral);
  await expect(
    drawer(page).locator(".document-review .review-actions button"),
  ).toHaveCount(0);
  await expect(
    drawer(page).getByRole("button", {
      name: "Подтвердить применимость",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    drawer(page).getByRole("button", {
      name: "Отклонить документ",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    drawer(page).getByRole("button", {
      name: "Скачать PDF записи",
      exact: true,
    }),
  ).toBeVisible();
  expect(writes(requests)).toEqual([]);
});

test("SQ11 current factor shows the retained reviewer ID and decision time without account lookup", async ({
  page,
}) => {
  const { requests } = await mount(page, { statuses: ["CONFIRMED"] });
  await page.goto(`${dossier}?section=review`);
  const factor = page.locator(".factor-row").first();
  await expect(factor).toContainText(reviewerId);
  await expect(factor).toContainText("2025");
  expect(requests.some((request) => request.path.includes("/users/"))).toBe(
    false,
  );
  expect(writes(requests)).toEqual([]);
});

test("SQ12 dashboard pending counter opens only current draft signals", async ({
  page,
}) => {
  const { requests } = await mount(page);
  await page.goto("/dashboard");
  const link = page
    .locator('a[href="/signals?state=DRAFT&is_stale=false"]')
    .first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/state=DRAFT&is_stale=false/);
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.path === "/api/v1/signals" &&
          new URLSearchParams(request.search).get("state") === "DRAFT" &&
          new URLSearchParams(request.search).get("is_stale") === "false",
      ),
    )
    .toBe(true);
  expect(writes(requests)).toEqual([]);
});

test("SQ13 provenance error is distinct from missing source and retry is GET only", async ({
  page,
}) => {
  const control = await mount(page, { sourceFailure: true });
  await page.goto(dossier);
  const origin = page.locator(".dossier-origin-card");
  await expect(origin.getByRole("alert")).toContainText(
    "DEMO Происхождение недоступно",
  );
  await expect(page.locator(".dossier-card-grid")).not.toContainText(
    "первичный источник не указан",
  );
  control.setSourceFailure(false);
  await origin
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(origin).toContainText("2010");
  expect(writes(control.requests)).toEqual([]);
});

test("SQ13 successful missing provenance remains explicit without importing a source", async ({
  page,
}) => {
  const { requests } = await mount(page, { sourceMissing: true });
  await page.goto(dossier);
  await expect(page.locator(".dossier-card-grid")).toContainText(
    "первичный источник не указан",
  );
  expect(writes(requests)).toEqual([]);
});

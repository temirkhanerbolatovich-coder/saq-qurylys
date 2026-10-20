import { expect, test, type Page } from "@playwright/test";
import type { SignalEvidence } from "../lib/types";
import {
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

const historicalReviewer = "70000000-0000-4000-8000-000000000001";
const original = "DEMO Исходный текст · Түпнұсқа Ә Ғ Қ Ң Ө Ұ Ү Һ І";

function historicalFixture() {
  const fixture = functionalSafetyFixture();
  const snapshot = fixture.signals[0].snapshot;
  const base: SignalEvidence = {
    id: "capture-only",
    kind: "ADVERTISEMENT_FRAGMENT",
    description: original,
    source_label: "DEMO CAPTURE_ONLY",
    source_url: null,
    advertisement_id: "70000000-0000-4000-8000-000000000002",
    asset_id: "70000000-0000-4000-8000-000000000003",
    captured_at: "2026-10-19T10:15:00+05:00",
    event_at: null,
    published_at: null,
    date_basis: "CAPTURE_ONLY",
    is_demo: true,
    fragment: { quote: original },
  };
  const legacy: SignalEvidence = {
    ...base,
    id: "legacy-date",
    source_label: "DEMO LEGACY",
    event_at: "2019-01-13T10:15:00+05:00",
  };
  delete legacy.published_at;
  delete legacy.date_basis;
  snapshot.evidence = [
    base,
    {
      ...base,
      id: "publication-date",
      source_label: "DEMO PUBLICATION",
      published_at: "2025-02-14T10:15:00+05:00",
      event_at: "2025-02-14T10:15:00+05:00",
      date_basis: "PUBLICATION",
    },
    legacy,
    {
      ...base,
      id: "document-date",
      kind: "CONSTRUCTION_PROGRESS",
      source_label: "DEMO DOCUMENT",
      advertisement_id: null,
      event_at: "2018-03-15T10:15:00+05:00",
    },
  ];
  snapshot.legal_bases = [
    {
      id: "70000000-0000-4000-8000-000000000004",
      mechanism: "GUARANTEE",
      document_number: "DEMO historical document",
      document_date: "2020-01-01",
      issuer: "DEMO Исторический источник · Тарихи дереккөз",
      scope_description: original,
      asset_id: base.asset_id,
      is_demo: true,
      revision: 1,
      verification_status: "VERIFIED_VALID",
      applies_from: "2021-04-16T10:15:00+05:00",
      applies_until: "2022-05-17T10:15:00+05:00",
      verification_as_of: "2023-06-18T10:15:00+05:00",
      reviewed_at: "2024-07-19T10:15:00+05:00",
      reviewed_by: historicalReviewer,
      evidence_ids: [],
    },
    {
      id: "70000000-0000-4000-8000-000000000005",
      mechanism: "GUARANTEE",
      document_number: null,
      document_date: null,
      issuer: "DEMO Legacy without reviewer",
      scope_description: original,
      asset_id: base.asset_id,
      is_demo: true,
      revision: 1,
      verification_status: "UNKNOWN",
      applies_from: null,
      applies_until: null,
      verification_as_of: null,
      reviewed_at: null,
      evidence_ids: [],
    },
  ];
  fixture.detail.legal_bases = [
    {
      ...snapshot.legal_bases[0],
      reviewed_by: fixtureUser.id,
      applies_until: "2099-01-01T00:00:00+05:00",
    },
  ];
  return fixture;
}

async function mount(page: Page, locale: "ru" | "kk") {
  const fixture = historicalFixture();
  const methods: string[] = [];
  await page.addInitScript(
    (value) => localStorage.setItem("saq-locale", value),
    locale,
  );
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    methods.push(request.method());
    await route.fulfill(
      fixture.response(request.method(), new URL(request.url()).pathname),
    );
  });
  await page.goto(`/signals?signal_id=${fixture.signals[0].signal.id}`);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  const panel = page.getByTestId("signal-detail");
  await expect(panel).toBeVisible();
  return { fixture, methods, panel };
}

for (const locale of ["ru", "kk"] as const) {
  test(`SQ01 signal dates retain publication uncertainty and document events in ${locale}`, async ({
    page,
  }) => {
    const { fixture, methods, panel } = await mount(page, locale);
    const sources = panel.locator("details").filter({
      has: page.locator("summary", { hasText: /^Доказательства и исходники/ }),
    });
    await sources.locator("summary").click();
    const article = (label: string) =>
      sources.locator("article").filter({
        has: page.getByText(label, { exact: true }),
      });
    const unknown = locale === "ru" ? "Не подтверждена" : "Расталмаған";
    const captured = locale === "ru" ? "Зафиксировано:" : "Тіркелген күні:";
    const event = locale === "ru" ? "Дата события:" : "Оқиға күні:";
    const legacy =
      locale === "ru"
        ? "Тип исторической даты не указан"
        : "Тарихи күннің түрі көрсетілмеген";
    await expect(article("DEMO CAPTURE_ONLY")).toContainText(unknown);
    await expect(article("DEMO CAPTURE_ONLY")).toContainText(
      new RegExp(`${captured}.*2026`),
    );
    await expect(article("DEMO CAPTURE_ONLY")).not.toContainText(event);
    await expect(article("DEMO PUBLICATION")).toContainText("2025");
    await expect(article("DEMO PUBLICATION")).toContainText("2026");
    await expect(article("DEMO PUBLICATION")).not.toContainText(unknown);
    await expect(article("DEMO LEGACY")).toContainText(unknown);
    await expect(article("DEMO LEGACY")).toContainText(legacy);
    await expect(article("DEMO LEGACY")).toContainText("2019");
    await expect(article("DEMO LEGACY")).not.toContainText(event);
    await expect(article("DEMO DOCUMENT")).toContainText(
      new RegExp(`${event}.*2018`),
    );
    await expect(article("DEMO DOCUMENT")).toContainText("2026");
    await expect(article("DEMO DOCUMENT").locator("blockquote")).toHaveText(
      original,
    );
    expect(fixture.writes).toEqual([]);
    expect(methods.every((method) => method === "GET")).toBe(true);
  });

  test(`SQ02 signal legal context uses frozen dates and historical reviewer in ${locale}`, async ({
    page,
  }) => {
    const { fixture, methods, panel } = await mount(page, locale);
    const bases = panel.locator("details").filter({
      has: page.locator("summary", { hasText: /^Правовые основания/ }),
    });
    await bases.locator("summary").click();
    const historic = bases.locator("article").filter({
      has: page.getByText("DEMO historical document", { exact: false }),
    });
    const missing = bases.locator("article").filter({
      has: page.getByText("DEMO Legacy without reviewer", { exact: false }),
    });
    for (const year of ["2021", "2022", "2023", "2024"])
      await expect(historic).toContainText(year);
    await expect(historic).toContainText(historicalReviewer);
    await expect(historic).not.toContainText(fixtureUser.id);
    await expect(historic).not.toContainText("2099");
    await expect(historic).toContainText(original);
    await expect(historic).toContainText(
      locale === "ru"
        ? "применимость основания сегодня требует отдельной проверки"
        : "негіздің бүгін қолданылуын бөлек тексеру қажет",
    );
    await expect(missing).toContainText(
      locale === "ru"
        ? "Не зафиксирован в снимке"
        : "Сақталған нұсқада тіркелмеген",
    );
    await expect(missing).toContainText(
      locale === "ru"
        ? "Не указано в снимке"
        : "Сақталған нұсқада көрсетілмеген",
    );
    expect(fixture.writes).toEqual([]);
    expect(methods.every((method) => method === "GET")).toBe(true);
  });

  test(`SQ01 SQ02 historical context remains readable at required widths in ${locale}`, async ({
    page,
  }, testInfo) => {
    const { fixture, methods, panel } = await mount(page, locale);
    const before = page.url();
    for (const heading of [
      /^Правовые основания/,
      /^Доказательства и исходники/,
    ]) {
      await panel
        .locator("details")
        .filter({ has: page.locator("summary", { hasText: heading }) })
        .locator("summary")
        .click();
    }
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page).toHaveURL(before);
      await expect(panel).toContainText(historicalReviewer);
      await expect(panel.locator("blockquote").first()).toHaveText(original);
      await expect(panel).toContainText(
        locale === "ru"
          ? "Тип исторической даты не указан"
          : "Тарихи күннің түрі көрсетілмеген",
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: testInfo.outputPath(`historical-${locale}-${width}.png`),
        fullPage: true,
      });
    }
    expect(fixture.writes).toEqual([]);
    expect(methods.every((method) => method === "GET")).toBe(true);
  });
}

test("SQ01 locale change preserves selected snapshot, source and decision draft without commands", async ({
  page,
}) => {
  const { fixture, methods, panel } = await mount(page, "ru");
  const reason = "DEMO авторский черновик · Авторлық жоба Ә Ғ Қ Ң Ө Ұ Ү Һ І";
  await panel.locator("#signal-reason").fill(reason);
  const before = page.url();
  await page
    .getByRole("combobox", { name: "Язык интерфейса", exact: true })
    .selectOption("kk");
  await expect(page.locator("html")).toHaveAttribute("lang", "kk");
  await expect(page).toHaveURL(before);
  await expect(panel.locator("#signal-reason")).toHaveValue(reason);
  const sources = panel.locator("details").filter({
    has: page.locator("summary", { hasText: /^Доказательства и исходники/ }),
  });
  await sources.locator("summary").click();
  await expect(
    sources.getByText("Расталмаған", { exact: false }).first(),
  ).toBeVisible();
  await expect(sources.locator("blockquote").first()).toHaveText(original);
  expect(fixture.writes).toEqual([]);
  expect(methods.every((method) => method === "GET")).toBe(true);
});

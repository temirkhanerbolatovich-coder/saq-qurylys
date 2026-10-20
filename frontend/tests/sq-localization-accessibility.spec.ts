import { expect, test, type Page } from "@playwright/test";
import type { Property } from "../lib/types";
import {
  fixtureProperty,
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

type Locale = "ru" | "kk";
const savedName = "DEMO ТК «Ә Ғ Қ Ң Ө Ұ Ү Һ І» · очередь источника 1";
const savedAddress = "DEMO ул. Исходная 12 · түпнұсқа мекенжай";
const savedQuote =
  "DEMO Исходная цитата: Оплатите первый этап 2 млн тенге сегодня…";
const savedReason = "DEMO сохранённое решение · бастапқы негіздеме өзгермейді";
const reviewedAt = "2026-03-17T10:25:00+05:00";
const basisId = "79000000-0000-4000-8000-000000000003";
const legalEvidenceId = "79000000-0000-4000-8000-000000000008";
const copy = {
  ru: {
    region: "Карта объектов",
    legend: "Легенда карты",
    selected: "Выбранный объект",
    marker: "Выбрать",
    zone: "Зелёная зона",
    zones: ["Зелёная", "Жёлтая", "Красная"],
    coverage: "1 из 2 объектов показаны на карте",
    missing: "Без пригодных координат: 1",
    retryMap: "Повторить карту",
    tileError: "Подложка карты недоступна или загружена не полностью.",
    empty: "Нет объектов с координатами для карты.",
    skip: "Перейти к списку объектов",
    retryData: "Повторить загрузку",
    filterLegal: "Фильтр по основанию",
    nullDate: "Не установлена",
    legalOptions: [
      "Все статусы",
      "Не проверено",
      "На проверке",
      "Основание подтверждено",
      "Отсутствие установлено",
      "Отклонено",
    ],
  },
  kk: {
    region: "Нысандар картасы",
    legend: "Карта белгілері",
    selected: "Таңдалған нысан",
    marker: "Таңдау",
    zone: "Жасыл аймақ",
    zones: ["Жасыл", "Сары", "Қызыл"],
    coverage: "2 нысанның 1 нысаны картада көрсетілген",
    missing: "Жарамды координаттары жоқ: 1",
    retryMap: "Картаны қайта жүктеу",
    tileError: "Карта қабаты қолжетімсіз немесе толық жүктелмеген.",
    empty: "Картаға арналған координаттары бар нысандар жоқ.",
    skip: "Нысандар тізіміне өту",
    retryData: "Қайта жүктеу",
    filterLegal: "Негіз бойынша сүзгі",
    nullDate: "Анықталмаған",
    legalOptions: [
      "Барлық мәртебелер",
      "Тексерілмеген",
      "Тексерілуде",
      "Негіз расталған",
      "Жоқ екені анықталған",
      "Қабылданбаған",
    ],
  },
} as const;

async function mount(page: Page, locale: Locale) {
  const fixture = functionalSafetyFixture();
  fixture.detail.property.name = savedName;
  fixture.detail.property.address = savedAddress;
  fixture.detail.property.latitude = 49.95;
  fixture.detail.property.longitude = 82.61;
  fixture.detail.property.last_reviewed_at = reviewedAt;
  fixture.detail.legal_bases = [
    {
      id: basisId,
      mechanism: "KZHK_GUARANTEE",
      document_number: "DEMO SOURCE-ҚҰЖАТ-17",
      document_date: "2026-03-01",
      issuer: "DEMO исходный издатель · дереккөз",
      scope_description: savedQuote,
      asset_id: "79000000-0000-4000-8000-000000000004",
      is_demo: true,
      revision: 1,
      verification_status: "PENDING",
      applies_from: null,
      applies_until: null,
      verification_as_of: null,
      reviewed_at: null,
      reviewed_by: null,
      evidence_ids: [legalEvidenceId],
    },
  ];
  const rows: Property[] = [
    fixture.detail.property,
    {
      ...structuredClone(fixture.detail.property),
      id: "79000000-0000-4000-8000-000000000002",
      name: "DEMO координаты не установлены",
      latitude: null,
      longitude: null,
      last_reviewed_at: null,
    },
  ];
  fixture.signals[0].signal.state = "CONFIRMED";
  fixture.signals[0].signal.created_at = reviewedAt;
  fixture.signals[0].snapshot.property = structuredClone(
    fixture.detail.property,
  );
  fixture.signals[0].snapshot.evidence = [
    {
      id: "79000000-0000-4000-8000-000000000005",
      kind: "ADVERTISEMENT_FRAGMENT",
      description: savedQuote,
      source_label: "DEMO неизменённый источник · түпнұсқа",
      source_url: null,
      advertisement_id: null,
      asset_id: "79000000-0000-4000-8000-000000000006",
      captured_at: reviewedAt,
      event_at: null,
      published_at: null,
      date_basis: "CAPTURE_ONLY",
      is_demo: true,
      fragment: { quote: savedQuote },
    },
  ];
  fixture.signals[0].decisions = [
    {
      id: "79000000-0000-4000-8000-000000000007",
      action: "CONFIRM",
      actor: fixtureUser,
      decided_at: reviewedAt,
      reason: savedReason,
    },
  ];
  const methods: string[] = [];
  const state = {
    failData: false,
    failTiles: false,
    emptyData: false,
    noCoordinates: false,
  };
  await page.addInitScript((language) => {
    localStorage.setItem("saq-locale", language);
    localStorage.setItem("saq-detailed-interface", "true");
  }, locale);
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    state.failTiles
      ? route.abort()
      : route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#edf2ed"/></svg>',
        }),
  );
  await page.route("**/api/v1/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    methods.push(request.method());
    if (url.pathname === "/api/v1/properties") {
      if (state.failData)
        return route.fulfill({
          status: 503,
          json: { error: { message: "DEMO outage · бастапқы сервер қатесі" } },
        });
      const items = state.emptyData
        ? []
        : rows.map((row) =>
            state.noCoordinates
              ? { ...row, latitude: null, longitude: null }
              : row,
          );
      return route.fulfill({
        json: { items, total: items.length, page: 1, page_size: 25 },
      });
    }
    if (url.pathname.endsWith("/provenance"))
      return route.fulfill({ json: null });
    if (url.pathname === `/api/v1/evidence/${legalEvidenceId}`)
      return route.fulfill({
        json: {
          id: legalEvidenceId,
          property_id: fixtureProperty.id,
          kind: "LEGAL_DOCUMENT",
          description: savedQuote,
          source_label: "DEMO сохранённый документ основания",
          asset_id: fixture.detail.legal_bases[0].asset_id,
          captured_at: reviewedAt,
          event_at: reviewedAt,
          is_demo: true,
        },
      });
    return route.fulfill(fixture.response(request.method(), url.pathname));
  });
  return { fixture, state, methods, rows };
}

async function setLanguage(page: Page, locale: Locale) {
  await page.locator(".shell-locale select").selectOption(locale);
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}

async function formattedDate(page: Page, locale: Locale) {
  return page.evaluate(
    ({ language, iso }) =>
      new Intl.DateTimeFormat(language === "kk" ? "kk-KZ" : "ru-RU", {
        timeZone: "Asia/Qyzylorda",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso)),
    { language: locale, iso: reviewedAt },
  );
}

for (const locale of ["ru", "kk"] as const) {
  test(`SQ09 map labels, keyboard selection and source facts survive language change from ${locale}`, async ({
    page,
  }) => {
    const { methods } = await mount(page, locale);
    await page.goto(
      "/properties?view=map&zone=GREEN&legal_status=UNKNOWN&q=DEMO",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const map = page.locator(".property-map-section");
    await expect(map).toHaveAccessibleName(copy[locale].region);
    await expect(map.locator(".map-legend")).toHaveAccessibleName(
      copy[locale].legend,
    );
    await expect(map.locator(".map-legend .zone")).toHaveText([
      ...copy[locale].zones,
    ]);
    await expect(map.locator(".map-count")).toHaveAccessibleName(
      copy[locale].coverage,
    );
    await expect(map).toContainText(copy[locale].missing);
    await expect(map).toContainText(
      locale === "ru"
        ? "Зелёная зона не подтверждает безопасность"
        : "Жасыл аймақ қауіпсіздікті растамайды",
    );
    const marker = page.locator(".property-marker");
    await expect(marker).toHaveCount(1);
    await expect(marker).toHaveAccessibleName(
      new RegExp(`^${copy[locale].marker} `),
    );
    expect(await marker.getAttribute("aria-label")).toContain(
      `${savedName}: 0, ${copy[locale].zone}`,
    );
    const originalMarker = await marker.elementHandle();
    await marker.focus();
    await marker.press("Enter");
    const card = map.locator(".map-card");
    await expect(card).toBeFocused();
    await expect(marker).toHaveAttribute("aria-pressed", "true");
    await expect(card).toContainText(savedName);
    await expect(card).toContainText(savedAddress);
    const originalUrl = page.url();
    const next = locale === "ru" ? "kk" : "ru";
    await setLanguage(page, next);
    await expect(map).toHaveAccessibleName(copy[next].region);
    await expect(card).toHaveAccessibleName(copy[next].selected);
    await expect(marker).toHaveAccessibleName(
      new RegExp(`^${copy[next].marker} `),
    );
    expect(
      await marker.evaluate(
        (current, before) => current === before,
        originalMarker,
      ),
    ).toBe(true);
    await expect(marker).toHaveAttribute("aria-pressed", "true");
    await expect(card).toContainText(savedName);
    await expect(card).toContainText(savedAddress);
    await expect(page).toHaveURL(originalUrl);
    await expect(
      page.getByLabel(copy[next].filterLegal, { exact: true }),
    ).toHaveValue("UNKNOWN");
    await map.getByRole("link", { name: copy[next].skip, exact: true }).click();
    await expect(page.locator("#property-list")).toBeFocused();
    expect(methods.every((method) => method === "GET")).toBe(true);
  });

  test(`SQ09 map errors, coordinate gaps, empty data and retry are usable in ${locale}`, async ({
    page,
  }) => {
    const { state, methods } = await mount(page, locale);
    state.failTiles = true;
    await page.goto("/properties?view=map");
    await expect(page.locator(".property-map-section")).toContainText(
      copy[locale].tileError,
    );
    await expect(page.locator(".property-marker")).toHaveCount(1);
    await expect(page.locator("#property-list tbody tr")).toHaveCount(2);
    const retry = page.getByRole("button", {
      name: copy[locale].retryMap,
      exact: true,
    });
    await retry.focus();
    await retry.press("Enter");
    await expect(page.locator(".property-map-section")).toContainText(
      copy[locale].tileError,
    );
    state.noCoordinates = true;
    await page.reload();
    await expect(page.locator(".property-map-section")).toContainText(
      copy[locale].empty,
    );
    await expect(page.locator(".property-marker")).toHaveCount(0);
    await expect(page.locator("#property-list tbody tr")).toHaveCount(2);
    state.failData = true;
    await page
      .getByLabel(copy[locale].filterLegal, { exact: true })
      .selectOption("UNKNOWN");
    await expect(
      page.getByRole("button", { name: copy[locale].retryData, exact: true }),
    ).toBeVisible();
    await expect(page.locator("#property-list")).toHaveCount(0);
    state.failData = false;
    state.emptyData = true;
    await page
      .getByRole("button", { name: copy[locale].retryData, exact: true })
      .click();
    await expect(page.locator("#property-list .empty").first()).toContainText(
      locale === "ru"
        ? "Объекты по выбранным фильтрам не найдены."
        : "Таңдалған сүзгілер бойынша нысандар табылмады.",
    );
    await expect(page.locator(".property-map-section")).toHaveCount(0);
    expect(methods.every((method) => method === "GET")).toBe(true);
  });

  test(`SQ09 initial stored ${locale} dates and nulls change with locale while historical facts stay exact`, async ({
    page,
  }) => {
    const { fixture, methods } = await mount(page, locale);
    await page.goto("/properties?view=map");
    const dateCell = page
      .locator("#property-list tbody tr")
      .first()
      .locator("td")
      .nth(4);
    await expect(dateCell).toHaveText(await formattedDate(page, locale));
    await expect(
      page.locator("#property-list tbody tr").nth(1).locator("td").nth(4),
    ).toHaveText(copy[locale].nullDate);
    const next = locale === "ru" ? "kk" : "ru";
    await setLanguage(page, next);
    await expect(dateCell).toHaveText(await formattedDate(page, next));
    await expect(
      page.locator("#property-list tbody tr").nth(1).locator("td").nth(4),
    ).toHaveText(copy[next].nullDate);
    const signal = fixture.signals[0].signal;
    await page.goto(`/signals?signal_id=${signal.id}`);
    const panel = page.getByTestId("signal-detail");
    await expect(panel).toContainText(await formattedDate(page, locale));
    await expect(panel).toContainText(savedReason);
    const sources = panel
      .locator("details")
      .filter({ has: page.locator("article", { hasText: savedQuote }) });
    await sources.locator("summary").click();
    await expect(sources).toContainText(savedQuote);
    await setLanguage(page, next);
    await expect(panel).toContainText(await formattedDate(page, next));
    await expect(panel).toContainText(savedReason);
    await expect(sources).toContainText(savedQuote);
    await expect(page).toHaveURL(new RegExp(`signal_id=${signal.id}`));
    expect(methods.every((method) => method === "GET")).toBe(true);
  });

  test(`SQ09 legal filter and document choices are localized in ${locale} without changing drafts`, async ({
    page,
  }) => {
    const { fixture, methods } = await mount(page, locale);
    await page.goto("/properties?legal_status=UNKNOWN");
    const filter = page.getByLabel(copy[locale].filterLegal, { exact: true });
    await expect(filter.locator("option")).toHaveText([
      ...copy[locale].legalOptions,
    ]);
    await filter.selectOption("PENDING");
    const filteredUrl = page.url();
    const next = locale === "ru" ? "kk" : "ru";
    await setLanguage(page, next);
    await expect(
      page.getByLabel(copy[next].filterLegal, { exact: true }),
    ).toHaveValue("PENDING");
    await expect(page).toHaveURL(filteredUrl);
    await page.goto(`/properties/${fixtureProperty.id}?section=documents`);
    await expect(
      page
        .getByLabel(locale === "ru" ? "Статус документа" : "Құжат мәртебесі", {
          exact: true,
        })
        .locator("option[value=PENDING]"),
    ).toHaveText(locale === "ru" ? "На проверке" : "Тексерілуде");
    const form = page
      .locator(".legal-review")
      .filter({ has: page.locator("#basis-mechanism") });
    await form.locator("details > summary").click();
    const mechanism = page.locator("#basis-mechanism");
    await expect(mechanism).toHaveAccessibleName(
      locale === "ru" ? "Механизм основания" : "Негіз механизмі",
    );
    await expect(mechanism.locator("option[value=KZHK_GUARANTEE]")).toHaveText(
      locale === "ru" ? "Гарантия КЖК" : "ҚТК кепілдігі",
    );
    await page.locator("#basis-number").fill("DEMO SOURCE-НӨМІР-НЕ-МЕНЯТЬ");
    await mechanism.selectOption("BANK_WITH_MIO_PERMIT");
    await setLanguage(page, next);
    await expect(mechanism).toHaveValue("BANK_WITH_MIO_PERMIT");
    await expect(page.locator("#basis-number")).toHaveValue(
      "DEMO SOURCE-НӨМІР-НЕ-МЕНЯТЬ",
    );
    const trigger = page
      .locator(".dossier-record-button")
      .filter({ hasText: fixture.detail.legal_bases[0].document_number! });
    await trigger.click();
    const reason = page.locator(`#basis-review-reason-${basisId}`);
    await expect(reason).toHaveAccessibleName(
      next === "ru"
        ? "Обоснование проверки основания"
        : "Негізді тексеру негіздемесі",
    );
    await reason.fill(savedReason);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await setLanguage(page, locale);
    await trigger.click();
    await expect(reason).toHaveValue(savedReason);
    await expect(page.getByRole("dialog")).toContainText(savedQuote);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(methods.every((method) => method === "GET")).toBe(true);
  });
}

test("SQ09 keyboard map naming and dossier controls reflow at 640 CSS px (1280px at 200% zoom equivalent)", async ({
  page,
}, testInfo) => {
  const { methods } = await mount(page, "kk");
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/properties?view=map");
  const marker = page.locator(".property-marker");
  await marker.focus();
  await marker.press("Space");
  await expect(page.locator(".map-card")).toBeFocused();
  await expect(page.locator(".property-map")).toHaveAccessibleName(
    "Интерактивті карта: көрсеткілер — жылжыту, қосу және азайту — масштаб",
  );
  const tree = await page.locator(".property-map-section").ariaSnapshot();
  expect(tree).toContain("Таңдалған нысан");
  expect(tree).toContain(savedName);
  await expect(page.locator(".leaflet-control-zoom-in")).toHaveAccessibleName(
    "Жақындату",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("sq09-kk-640-reflow-map.png"),
    fullPage: true,
  });
  await page.goto(`/properties/${fixtureProperty.id}?section=documents`);
  await expect(
    page.getByRole("heading", { name: savedName, exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("sq09-kk-640-reflow-dossier.png"),
    fullPage: true,
  });
  expect(methods.every((method) => method === "GET")).toBe(true);
});

test("SQ09 a loaded publication comparison updates dates without reloading or changing source selections", async ({
  page,
}) => {
  const { methods } = await mount(page, "ru");
  const material = {
    id: "79000000-0000-4000-8000-000000000021",
    revision: 1,
    source_label: "DEMO сохранённое имя источника · Ә Ғ Қ Ң Ө Ұ Ү Һ І",
    source_url: null,
    published_at: null,
    captured_at: reviewedAt,
    original_text: savedQuote,
    is_demo: true,
    status: "READY_FOR_REVIEW",
    assets: [],
    latest_job_id: null,
    confirmed_property_id: null,
  };
  const rightId = "79000000-0000-4000-8000-000000000022";
  const source = (id: string) => ({
    advertisement_id: id,
    advertisement_revision: 1,
    source_label: material.source_label,
    source_url: null,
    published_at: null,
    captured_at: reviewedAt,
    is_demo: true,
    text_basis: "ORIGINAL",
    extraction_id: null,
    extraction_revision: null,
    pipeline_version: null,
    analysis_created_at: null,
    source_asset_id: null,
    original_assets: [],
    text: savedQuote,
    text_sha256: "a".repeat(64),
  });
  await page.route("**/api/v1/advertisements**", (route) => {
    const request = route.request();
    methods.push(request.method());
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith("/compare"))
      return route.fulfill({
        json: {
          left: source(material.id),
          right: source(rightId),
          status: "IDENTICAL_TEXT",
          same_advertisement: false,
          same_source_url: null,
          changes: [],
        },
      });
    if (pathname.endsWith("/extractions")) return route.fulfill({ json: [] });
    if (pathname === "/api/v1/advertisements")
      return route.fulfill({
        json: {
          items: [material, { ...material, id: rightId }],
          total: 2,
          page: 1,
          page_size: 20,
        },
      });
    return route.fulfill({
      json: { ...material, id: pathname.split("/").at(-1) },
    });
  });
  await page.goto(`/comparison?left_id=${material.id}&right_id=${rightId}`);
  const sides = page.locator('[aria-label^="Сравниваемый источник:"]');
  await expect(sides).toHaveCount(2);
  await expect(sides.first()).toContainText(await formattedDate(page, "ru"));
  await expect(sides.first()).toContainText("Не установлена");
  await expect(sides.first()).toContainText(savedQuote);
  const selectedUrl = page.url();
  await setLanguage(page, "kk");
  await expect(sides.first()).toContainText(await formattedDate(page, "kk"));
  await expect(sides.first()).toContainText("Анықталмаған");
  await expect(sides.first()).toContainText(savedQuote);
  await expect(sides.first()).toContainText(material.source_label);
  await expect(page).toHaveURL(selectedUrl);
  expect(methods.every((method) => method === "GET")).toBe(true);
});

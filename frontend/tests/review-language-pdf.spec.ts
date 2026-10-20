import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pdfDownloadFilename } from "../lib/presentation";
import type {
  Advertisement,
  AdvertisementReviewItem,
  Extraction,
} from "../lib/types";
import {
  fixtureProperty,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

const fallback = "saq-document-demo.pdf";
const unicodeName = "saq-signal-DEMO-Өркен-2026-10-19-demo-v2-r1.pdf";
for (const [label, header, expected] of [
  [
    "unicode",
    `attachment; filename="old.pdf"; filename*=UTF-8''${encodeURIComponent(unicodeName)}`,
    unicodeName,
  ],
  [
    "language",
    `attachment; filename*=utf-8'kk'${encodeURIComponent(unicodeName)}`,
    unicodeName,
  ],
  [
    "malformed",
    "attachment; filename*=UTF-8''%ZZ; filename=backup.pdf",
    "backup.pdf",
  ],
  ["path", "attachment; filename=../unsafe.pdf", fallback],
  ["encoded path", "attachment; filename*=UTF-8''..%2Funsafe.pdf", fallback],
  ["bidi", "attachment; filename*=UTF-8''bad%E2%80%AEpdf.pdf", fallback],
  ["extension", 'attachment; filename="unsafe.exe"', fallback],
  ["long", `attachment; filename="${"x".repeat(250)}.pdf"`, fallback],
  ["missing", "", fallback],
] as const) {
  test(`PDF filename parser handles ${label}`, () => {
    expect(pdfDownloadFilename(header, fallback)).toBe(expected);
  });
}

const ad: Advertisement = {
  id: "70000000-0000-4000-8000-000000000001",
  revision: 1,
  latest_job_id: null,
  source_label: "DEMO стадия и прежний объект",
  source_url: null,
  original_text: "DEMO строится.",
  published_at: null,
  captured_at: fixtureProperty.risk.as_of,
  status: "READY_FOR_REVIEW",
  assets: [],
  is_demo: true,
  confirmed_property_id: "70000000-0000-4000-8000-000000000002",
};
const extraction: Extraction = {
  id: "70000000-0000-4000-8000-000000000003",
  revision: 1,
  parent_extraction_id: null,
  pipeline_version: "DEMO",
  original_ocr_text: null,
  analysis_text: ad.original_text,
  warnings: [],
  created_at: ad.captured_at,
  hypotheses: [
    {
      id: "70000000-0000-4000-8000-000000000004",
      field: "STAGE",
      review_status: "PENDING",
      reviewed_value: null,
      value: { text: "UNDER_CONSTRUCTION", money: null, percent: null },
      fragment: {
        asset_id: "70000000-0000-4000-8000-000000000005",
        text_version_id: "70000000-0000-4000-8000-000000000003",
        quote: "строится",
        start_offset: 5,
        end_offset: 13,
        bbox: null,
      },
    },
  ],
};

async function mount(page: Page, named = true) {
  const fixture = functionalSafetyFixture();
  const work: AdvertisementReviewItem = {
    advertisement: ad,
    advertisement_id: ad.id,
    extraction_id: extraction.id,
    extraction_revision: 1,
    actions: ["REVIEW_HYPOTHESES", "REVIEW_R2"],
    pending_hypothesis_ids: [extraction.hypotheses[0].id],
    needs_property_match: false,
    payment_hypothesis_ids: [],
    r2_reviews: [
      {
        property_id: fixtureProperty.id,
        property_name: named ? fixtureProperty.name : null,
        factor_id: null,
        evidence_ids: [],
      },
    ],
  };
  await page.addInitScript(() =>
    localStorage.setItem("saq-detailed-interface", "true"),
  );
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let result: { status: number; json?: object } = fixture.response(
      request.method(),
      url.pathname,
    );
    if (url.pathname.endsWith("/advertisements/review-queue"))
      result = {
        status: 200,
        json: {
          items: [work],
          total: 1,
          page: 1,
          page_size: 20,
          action_totals: {
            REVIEW_HYPOTHESES: 1,
            REVIEW_MATCH: 0,
            CREATE_PAYMENT_EVIDENCE: 0,
            REVIEW_R2: 1,
          },
        },
      };
    if (url.pathname === `/api/v1/advertisements/${ad.id}`)
      result = { status: 200, json: ad };
    if (url.pathname === `/api/v1/advertisements/${ad.id}/extractions`)
      result = { status: 200, json: [extraction] };
    if (url.pathname === `/api/v1/advertisements/${ad.id}/matches`)
      result = { status: 200, json: [] };
    await route.fulfill(result);
  });
  return fixture;
}

for (const named of [true, false]) {
  test(`R2 target ${named ? "name" : "explicit ID fallback"} stays with its own historical object and draft`, async ({
    page,
  }) => {
    const fixture = await mount(page, named);
    const name = named ? fixtureProperty.name : fixtureProperty.id;
    await page.goto("/review?queue=actions");
    const summary = page
      .locator("summary")
      .filter({ hasText: `Проверить решение R2 по объекту ${name}` });
    await summary.click();
    const form = page.getByLabel(`Решение R2: ${name}`, { exact: true });
    await expect(form).toContainText(
      "Исторический R2 относится к прежнему объекту",
    );
    await expect(form.getByRole("link")).toHaveAttribute(
      "href",
      `/properties/${fixtureProperty.id}#dossier-factors`,
    );
    const reason = form.getByLabel(
      `Обоснование решения R2 по объекту ${name}`,
      { exact: true },
    );
    await reason.fill("DEMO проверяю прежний источник · Ә Ғ Қ Ң Ө Ұ Ү Һ І");
    await summary.click();
    await summary.click();
    await expect(reason).toHaveValue(/DEMO проверяю прежний источник/);
    const folder = path.resolve("../output/qa/review-pdf-20261019");
    await mkdir(folder, { recursive: true });
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: path.join(
          folder,
          `r2-${named ? "name" : "fallback"}-${width}.png`,
        ),
        fullPage: true,
      });
    }
    expect(fixture.writes).toEqual([]);
  });
}

test("stage uses a human label while retaining the saved code without commands", async ({
  page,
}) => {
  const fixture = await mount(page);
  await page.goto(
    `/review?queue=actions&advertisement_id=${ad.id}&review_extraction_id=${extraction.id}`,
  );
  const hypothesis = page.locator(`#hypothesis-${extraction.hypotheses[0].id}`);
  await expect(hypothesis.getByText("Строится", { exact: true })).toBeVisible();
  await expect(
    hypothesis.getByText("UNDER_CONSTRUCTION", { exact: true }),
  ).toBeHidden();
  await hypothesis
    .locator("summary")
    .filter({ hasText: "Сохранённое значение стадии" })
    .click();
  await expect(hypothesis.locator("code")).toHaveText("UNDER_CONSTRUCTION");
  expect(fixture.writes).toEqual([]);
});

test("browser PDF download uses Unicode headers and retains real failure and retry behavior", async ({
  page,
}) => {
  const fixture = await mount(page);
  let invalid = true;
  await page.route(
    `**/api/v1/exports/properties/${fixtureProperty.id}/pdf`,
    (route) =>
      route.fulfill({
        contentType: "application/pdf",
        headers: {
          "content-disposition": `attachment; filename=backup.pdf; filename*=UTF-8''${encodeURIComponent(unicodeName)}`,
        },
        body: invalid
          ? "DEMO invalid PDF response"
          : "%PDF-1.7\n% DEMO presentation fixture, no renderer\n%%EOF",
      }),
  );
  await page.goto(`/properties/${fixtureProperty.id}?section=signals`);
  const button = page.getByRole("button", {
    name: "Скачать отчёт по объекту",
    exact: true,
  });
  await button.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Сервер не вернул PDF" }),
  ).toBeVisible();
  invalid = false;
  const download = page.waitForEvent("download");
  await button.click();
  expect((await download).suggestedFilename()).toBe(unicodeName);
  await expect(button).toBeEnabled();
  await expect(
    page.getByRole("alert").filter({ hasText: "Сервер не вернул PDF" }),
  ).toHaveCount(0);
  expect(fixture.writes).toEqual([]);
});

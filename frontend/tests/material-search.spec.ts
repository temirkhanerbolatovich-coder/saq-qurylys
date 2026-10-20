import { expect, test, type Page } from "@playwright/test";
import { functionalSafetyFixture } from "./functional-safety.fixture";
import type { Advertisement, Extraction } from "../lib/types";

const id = "80000000-0000-4000-8000-000000000001";
const extractionId = "80000000-0000-4000-8000-000000000002";
const ad: Advertisement = {
  id,
  revision: 1,
  source_label: "DEMO Өскемен",
  original_text: "DEMO корпус А 20%",
  source_url: null,
  published_at: null,
  captured_at: "2026-10-19T00:00:00Z",
  status: "READY_FOR_REVIEW",
  is_demo: true,
  confirmed_property_id: null,
  latest_job_id: null,
  assets: [],
};
const extraction: Extraction = {
  id: extractionId,
  revision: 1,
  parent_extraction_id: null,
  pipeline_version: "DEMO",
  original_ocr_text: null,
  analysis_text: ad.original_text,
  created_at: ad.captured_at,
  warnings: [],
  hypotheses: [
    {
      id: "80000000-0000-4000-8000-000000000003",
      field: "STAGE",
      review_status: "PENDING",
      reviewed_value: null,
      value: { text: "UNKNOWN", percent: null, money: null },
      fragment: {
        asset_id: id,
        text_version_id: extractionId,
        quote: "DEMO",
        start_offset: 0,
        end_offset: 4,
        bbox: null,
      },
    },
  ],
};

// Real UI with synthetic read responses; backend search is covered separately on PostgreSQL.
async function mount(page: Page) {
  const fixture = functionalSafetyFixture();
  const reads: URL[] = [];
  let fail = false;
  await page.addInitScript(() =>
    localStorage.setItem("saq-detailed-interface", "true"),
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      [
        "/api/v1/advertisements",
        "/api/v1/advertisements/review-queue",
      ].includes(url.pathname)
    ) {
      reads.push(url);
      if (fail)
        return route.fulfill({
          status: 503,
          json: { error: { message: "DEMO очередь недоступна" } },
        });
      const empty = url.searchParams.get("q") === "нет совпадений";
      const actions = url.pathname.endsWith("review-queue");
      const row = actions
        ? {
            advertisement: ad,
            advertisement_id: id,
            extraction_id: extractionId,
            extraction_revision: 1,
            actions: ["REVIEW_HYPOTHESES"],
            pending_hypothesis_ids: [extraction.hypotheses[0].id],
            needs_property_match: false,
            payment_hypothesis_ids: [],
            r2_reviews: [],
          }
        : ad;
      return route.fulfill({
        json: {
          items: empty ? [] : [row],
          total: empty ? 0 : 21,
          page: Number(url.searchParams.get("page") || 1),
          page_size: 20,
          action_totals: {
            REVIEW_HYPOTHESES: empty ? 0 : 21,
            REVIEW_MATCH: 0,
            CREATE_PAYMENT_EVIDENCE: 0,
            REVIEW_R2: 0,
          },
        },
      });
    }
    if (url.pathname === `/api/v1/advertisements/${id}`)
      return route.fulfill({ json: ad });
    if (url.pathname === `/api/v1/advertisements/${id}/extractions`)
      return route.fulfill({ json: [extraction] });
    if (url.pathname === `/api/v1/advertisements/${id}/matches`)
      return route.fulfill({ json: [] });
    return route.fulfill(fixture.response(request.method(), url.pathname));
  });
  return {
    fixture,
    reads,
    fail: (value: boolean) => {
      fail = value;
    },
  };
}
const input = (page: Page) =>
  page.getByRole("searchbox", {
    name: "Текст публикации или название источника",
    exact: true,
  });

test("library search preserves filters, server pages and return from material", async ({
  page,
}) => {
  const { reads, fixture } = await mount(page);
  await page.goto("/advertisements?status=READY_FOR_REVIEW&page=2");
  await input(page).fill("  Өскемен 20%  ");
  await page
    .getByLabel("Режим материалов", { exact: true })
    .selectOption("false");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("is_demo"))
    .toBe("false");
  await input(page).press("Enter");
  await expect(input(page)).toHaveValue("Өскемен 20%");
  await expect
    .poll(() => reads.at(-1)?.searchParams.get("q"))
    .toBe("Өскемен 20%");
  expect(reads.at(-1)?.searchParams.get("status")).toBe("READY_FOR_REVIEW");
  expect(reads.at(-1)?.searchParams.get("is_demo")).toBe("false");
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await page.getByRole("button", { name: "Следующая", exact: true }).click();
  await expect.poll(() => reads.at(-1)?.searchParams.get("page")).toBe("2");
  await page.getByRole("link", { name: ad.source_label, exact: true }).click();
  await page.getByRole("link", { name: "К публикациям" }).click();
  await expect(input(page)).toHaveValue("Өскемен 20%");
  expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  await page
    .getByRole("button", { name: "Сбросить поиск", exact: true })
    .click();
  await expect(input(page)).toHaveValue("");
  expect(new URL(page.url()).searchParams.get("status")).toBe(
    "READY_FOR_REVIEW",
  );
  expect(fixture.writes).toEqual([]);
});

for (const queue of ["actions", "processing"]) {
  test(`${queue} search keeps selected version and reason through empty result, filters and reload`, async ({
    page,
  }) => {
    const { fixture, reads } = await mount(page);
    await page.goto(
      `/review?queue=${queue}&advertisement_id=${id}&review_extraction_id=${extractionId}&page=2`,
    );
    const reason = page.getByRole("textbox", {
      name: "Обоснование проверки",
      exact: true,
    });
    await reason.fill("DEMO сохранённая причина · тексеру");
    await page
      .locator("summary")
      .filter({ hasText: "Сменить материал · очередь и фильтры" })
      .click();
    await input(page).fill("нет совпадений");
    await input(page).press("Enter");
    await expect
      .poll(() => reads.at(-1)?.searchParams.get("q"))
      .toBe("нет совпадений");
    await expect(reason).toHaveValue("DEMO сохранённая причина · тексеру");
    expect(new URL(page.url()).searchParams.get("advertisement_id")).toBe(id);
    expect(new URL(page.url()).searchParams.get("review_extraction_id")).toBe(
      extractionId,
    );
    expect(new URL(page.url()).searchParams.has("page")).toBe(false);
    await expect(
      page.getByText(/Измените или сбросьте поиск и фильтры/),
    ).toBeVisible();
    if (queue === "actions")
      await page
        .getByLabel("Режим материалов", { exact: true })
        .selectOption("true");
    else
      await page
        .getByLabel("Состояние материала", { exact: true })
        .selectOption("READY_FOR_REVIEW");
    await expect
      .poll(() =>
        reads
          .at(-1)
          ?.searchParams.get(queue === "actions" ? "is_demo" : "status"),
      )
      .toBe(queue === "actions" ? "true" : "READY_FOR_REVIEW");
    expect(reads.at(-1)?.searchParams.get("q")).toBe("нет совпадений");
    await page
      .getByLabel("Режим материалов", { exact: true })
      .selectOption("false");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("is_demo"))
      .toBe("false");
    const otherQueue =
      queue === "actions" ? "Состояния обработки" : "Нерешённые действия";
    await page.getByRole("link", { name: otherQueue, exact: true }).click();
    await expect
      .poll(() => reads.at(-1)?.searchParams.get("is_demo"))
      .toBe("false");
    await expect(reason).toHaveValue("DEMO сохранённая причина · тексеру");
    await page
      .getByRole("link", {
        name:
          queue === "actions" ? "Нерешённые действия" : "Состояния обработки",
        exact: true,
      })
      .click();
    await page.reload();
    await expect(reason).toHaveValue("DEMO сохранённая причина · тексеру");
    await page
      .locator("summary")
      .filter({ hasText: "Сменить материал · очередь и фильтры" })
      .click();
    await expect(input(page)).toHaveValue("нет совпадений");
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page
        .getByRole("search", { name: "Поиск материалов", exact: true })
        .evaluate((form) => {
          window.scrollTo(
            0,
            window.scrollY + form.getBoundingClientRect().top - 120,
          );
        });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `../output/qa/material-search-20261019/${queue}-${width}.png`,
      });
    }
    expect(fixture.writes).toEqual([]);
  });
}

test("search errors retain query and permit explicit retry without commands", async ({
  page,
}) => {
  const context = await mount(page);
  await page.goto("/review?queue=actions");
  context.fail(true);
  await input(page).fill("DEMO Өскемен");
  const failedSearch = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.endsWith("/advertisements/review-queue") &&
      url.searchParams.get("q") === "DEMO Өскемен" &&
      response.status() === 503
    );
  });
  await input(page).press("Enter");
  await failedSearch;
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("DEMO Өскемен");
  const queue = page.getByRole("region", {
    name: "Нерешённые действия материалов",
    exact: true,
  });
  await expect(queue.getByRole("alert")).toContainText("очередь недоступна");
  await expect(input(page)).toHaveValue("DEMO Өскемен");
  context.fail(false);
  await queue
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(queue.getByRole("alert")).toHaveCount(0);
  expect(context.reads.at(-1)?.searchParams.get("q")).toBe("DEMO Өскемен");
  expect(context.fixture.writes).toEqual([]);
});

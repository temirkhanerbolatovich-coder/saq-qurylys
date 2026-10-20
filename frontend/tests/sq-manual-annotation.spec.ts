import { expect, test, type Page } from "@playwright/test";
import type { Advertisement, Extraction, Hypothesis, User } from "../lib/types";
import {
  fixtureUser,
  functionalSafetyFixture,
} from "./functional-safety.fixture";

const quote = " Оплатите первый этап 2 млн теңге бүгін. ";
const original = `DEMO 🏠 Ә Ғ Қ Ң Ө Ұ Ү Һ І.\n${quote}\nДом ещё строится.`;
const proposer = { ...fixtureUser, display_name: "DEMO Автор предложения" };
const reviewer: User = {
  ...fixtureUser,
  id: "71000000-0000-4000-8000-000000000001",
  display_name: "DEMO Независимый аналитик",
};
const timestamp = "2026-10-20T12:00:00+05:00";
const start = Array.from(original.slice(0, original.indexOf(quote))).length;
const end = start + Array.from(quote).length;

/** Presentation responses only: no parser, database, decision or external source runs. */
async function mount(
  page: Page,
  options: {
    actor?: User;
    pending?: boolean;
    conflict?: boolean;
    networkFailure?: boolean;
    locale?: "ru" | "kk";
    view?: "review" | "advertisement";
  } = {},
) {
  const actor = options.actor || proposer;
  const fixture = functionalSafetyFixture();
  fixture.setActor(actor);
  const ad: Advertisement = {
    id: "71000000-0000-4000-8000-000000000002",
    revision: 1,
    latest_job_id: null,
    source_label: "DEMO Исходный источник · Бастапқы дереккөз",
    source_url: null,
    original_text: original,
    published_at: null,
    captured_at: timestamp,
    status: "READY_FOR_REVIEW",
    assets: [],
    is_demo: true,
    confirmed_property_id: null,
  };
  function proposal(): Hypothesis {
    return {
      id: "71000000-0000-4000-8000-000000000003",
      field: "PAYMENT_TERM",
      origin: "MANUAL",
      value: { text: quote, money: null, percent: null },
      reviewed_value: null,
      review_status: "PENDING",
      proposed_by: proposer,
      proposed_at: timestamp,
      proposal_reason: "DEMO Независимое предложение точной цитаты",
      reviewed_by: null,
      reviewed_at: null,
      review_reason: null,
      fragment: {
        asset_id: "71000000-0000-4000-8000-000000000004",
        text_version_id: "71000000-0000-4000-8000-000000000005",
        quote,
        start_offset: start,
        end_offset: end,
        bbox: null,
      },
    };
  }
  const extraction: Extraction = {
    id: "71000000-0000-4000-8000-000000000005",
    revision: 1,
    parent_extraction_id: null,
    pipeline_version: "DEMO presentation fixture",
    original_ocr_text: null,
    analysis_text: original,
    created_at: timestamp,
    warnings: [],
    hypotheses: options.pending ? [proposal()] : [],
  };
  const commands: {
    path: string;
    body: Record<string, unknown>;
    key: string | undefined;
  }[] = [];
  let conflict = options.conflict;
  let networkFailure = options.networkFailure;
  await page.addInitScript(
    (locale) => localStorage.setItem("saq-locale", locale),
    options.locale || "ru",
  );
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      commands.push({
        path: url.pathname,
        body,
        key: request.headers()["idempotency-key"],
      });
      if (url.pathname.endsWith("/manual-annotations")) {
        if (networkFailure) {
          networkFailure = false;
          return route.abort("failed");
        }
        if (conflict) {
          conflict = false;
          extraction.revision++;
          return route.fulfill({
            status: 409,
            json: {
              error: { message: "DEMO Версия изменилась; обновите данные" },
            },
          });
        }
        const manual = proposal();
        manual.proposal_reason = body.reason;
        extraction.hypotheses.push(manual);
        extraction.revision++;
        return route.fulfill({ status: 201, json: extraction });
      }
      if (url.pathname === `/api/v1/extractions/${extraction.id}/review`) {
        const manual = extraction.hypotheses[0];
        manual.review_status =
          body.action === "CONFIRM" ? "CONFIRMED" : "REJECTED";
        manual.reviewed_by = actor;
        manual.reviewed_at = timestamp;
        manual.review_reason = body.reason;
        extraction.revision++;
        return route.fulfill({ status: 200, json: extraction });
      }
    }
    if (url.pathname === "/api/v1/advertisements")
      return route.fulfill({
        json: { items: [ad], page: 1, page_size: 25, total: 1 },
      });
    if (url.pathname === `/api/v1/advertisements/${ad.id}`)
      return route.fulfill({ json: ad });
    if (url.pathname === `/api/v1/advertisements/${ad.id}/extractions`)
      return route.fulfill({ json: [extraction] });
    if (url.pathname === `/api/v1/advertisements/${ad.id}/matches`)
      return route.fulfill({ json: [] });
    return route.fulfill(fixture.response(request.method(), url.pathname));
  });
  await page.goto(
    options.view === "advertisement"
      ? `/advertisements/${ad.id}`
      : `/review?advertisement_id=${ad.id}`,
  );
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    options.locale || "ru",
  );
  return {
    ad,
    extraction,
    commands,
    form: page.getByTestId("manual-annotation"),
  };
}

async function selectOriginal(page: Page) {
  const form = page.getByTestId("manual-annotation");
  await form.locator("summary").click();
  const source = form.locator("textarea[readonly]");
  await source.evaluate(
    (element, range) => {
      if (!(element instanceof HTMLTextAreaElement))
        throw new Error("Expected a read-only source textarea");
      element.focus();
      element.setSelectionRange(range.first, range.last);
    },
    {
      first: original.indexOf(quote),
      last: original.indexOf(quote) + quote.length,
    },
  );
  await source.dispatchEvent("mouseup");
  await expect(form.locator('input[type="number"]').nth(0)).toHaveValue(
    String(start),
  );
  await expect(form.locator('input[type="number"]').nth(1)).toHaveValue(
    String(end),
  );
  expect(await form.getByTestId("manual-annotation-quote").textContent()).toBe(
    quote,
  );
  return form;
}

for (const locale of ["ru", "kk"] as const) {
  test(`SQ04 proposes the unchanged Unicode quote and disables self review in ${locale}`, async ({
    page,
  }) => {
    const { commands, extraction, ad } = await mount(page, { locale });
    const form = await selectOriginal(page);
    await expect(form).toContainText(ad.source_label);
    await expect(form).toContainText(extraction.id);
    await expect(form.locator("textarea[readonly]")).toHaveValue(original);
    const reason = "DEMO Ә Ғ Қ: условие оплаты пропущено правилами";
    await form.locator("textarea:not([readonly])").fill(reason);
    expect(commands).toEqual([]);
    await form.locator('button[type="submit"]').click();
    await expect(form.getByRole("status")).toContainText(
      locale === "ru" ? "Предложение сохранено" : "Ұсыныс сақталды",
    );
    expect(commands).toHaveLength(1);
    expect(commands[0].body).toEqual({
      expected_revision: 1,
      start_offset: start,
      end_offset: end,
      quote,
      reason,
      field: "PAYMENT_TERM",
    });
    expect(commands[0].key).toBeTruthy();
    const card = page.locator(`#hypothesis-${extraction.hypotheses[0].id}`);
    await expect(card).toContainText(proposer.display_name);
    await expect(card).toContainText(reason);
    await expect(card).toContainText(
      locale === "ru"
        ? "Собственное предложение проверять нельзя"
        : "Өз ұсынысыңызды тексеруге болмайды",
    );
    await card
      .locator("input")
      .fill("DEMO причина не разрешает самоутверждение");
    const actions = card.locator(".review-actions button");
    await expect(actions).toHaveCount(2);
    await expect(actions.nth(0)).toBeDisabled();
    await expect(actions.nth(1)).toBeDisabled();
    expect(commands.map((row) => row.path)).toEqual([
      `/api/v1/extractions/${extraction.id}/manual-annotations`,
    ]);
  });
}

for (const action of ["CONFIRM", "REJECT"] as const) {
  test(`SQ04 independent reviewer can ${action} the proposal as a separate decision`, async ({
    page,
  }) => {
    const { commands, extraction } = await mount(page, {
      actor: reviewer,
      pending: true,
    });
    const card = page.locator(`#hypothesis-${extraction.hypotheses[0].id}`);
    await expect(card).toContainText("ожидает независимой проверки");
    const reason = `DEMO independent ${action}: исходная цитата проверена`;
    await card.locator("input").fill(reason);
    const actions = card.locator(".review-actions button");
    await expect(actions).toHaveCount(2);
    await expect(actions.nth(0)).toBeEnabled();
    await actions.nth(action === "CONFIRM" ? 0 : 1).click();
    await expect(card).toContainText(
      action === "CONFIRM" ? "принято независимым аналитиком" : "отклонено",
    );
    await expect(card).toContainText(reviewer.display_name);
    await expect(card).toContainText(reason);
    expect(commands).toHaveLength(1);
    expect(commands[0].body).toEqual({
      expected_revision: 1,
      hypothesis_id: extraction.hypotheses[0].id,
      action,
      reason,
    });
    expect(commands[0].path).toBe(
      `/api/v1/extractions/${extraction.id}/review`,
    );
    expect(extraction.analysis_text).toBe(original);
  });
}

test("SQ04 conflict retains offsets and reason, refresh is read only and retry uses the new revision", async ({
  page,
}) => {
  const { commands, extraction } = await mount(page, { conflict: true });
  const form = await selectOriginal(page);
  const reason = "DEMO сохранить причину при конфликте";
  await form.locator("textarea:not([readonly])").fill(reason);
  await form.locator('button[type="submit"]').click();
  await expect(form.getByRole("alert")).toContainText("DEMO Версия изменилась");
  await expect(form.locator("textarea:not([readonly])")).toHaveValue(reason);
  await expect(form.locator('input[type="number"]').nth(0)).toHaveValue(
    String(start),
  );
  expect(await form.getByTestId("manual-annotation-quote").textContent()).toBe(
    quote,
  );
  expect(commands).toHaveLength(1);
  await form
    .getByRole("button", {
      name: "Обновить версию без потери черновика",
      exact: true,
    })
    .click();
  await expect(form).toContainText("Ревизия: 2");
  expect(commands).toHaveLength(1);
  await form.locator('button[type="submit"]').click();
  await expect(form.getByRole("status")).toContainText("Предложение сохранено");
  expect(commands).toHaveLength(2);
  expect(commands[1].body).toEqual({
    ...commands[0].body,
    expected_revision: 2,
  });
  expect(commands[1].key).not.toBe(commands[0].key);
  expect(extraction.analysis_text).toBe(original);
});

test("SQ04 network retry retains the command key and exact quote without automatic commands", async ({
  page,
}) => {
  const { commands } = await mount(page, { networkFailure: true });
  const form = await selectOriginal(page);
  await form.locator("textarea:not([readonly])").fill("DEMO безопасный повтор");
  await form.locator('button[type="submit"]').click();
  await expect(form.getByRole("alert")).toContainText(
    "Границы и обоснование сохранены",
  );
  expect(commands).toHaveLength(1);
  await form.locator('button[type="submit"]').click();
  await expect(form.getByRole("status")).toContainText("Предложение сохранено");
  expect(commands).toHaveLength(2);
  expect(commands[1]).toEqual(commands[0]);
});

test("SQ04 read-only viewer sees manual provenance without proposal or review commands", async ({
  page,
}) => {
  const { form, commands } = await mount(page, {
    actor: { ...reviewer, role: "viewer" },
    pending: true,
  });
  await expect(form).toHaveCount(0);
  const card = page
    .locator(".hypothesis")
    .filter({ hasText: "Ручное предложение:" });
  await expect(card).toContainText(proposer.display_name);
  await expect(card.locator(".review-actions button")).toHaveCount(0);
  expect(commands).toEqual([]);
});

for (const locale of ["ru", "kk"] as const) {
  test(`SQ04 advertisement detail embeds the same exact proposal form in ${locale}`, async ({
    page,
  }) => {
    const { commands, ad, extraction } = await mount(page, {
      view: "advertisement",
      locale,
    });
    const form = await selectOriginal(page);
    await expect(form.locator("textarea[readonly]")).toHaveValue(original);
    await form
      .locator("textarea:not([readonly])")
      .fill("DEMO предложение из карточки материала");
    expect(commands).toEqual([]);
    await form.locator('button[type="submit"]').click();
    await expect(form.getByRole("status")).toContainText(
      locale === "ru" ? "Предложение сохранено" : "Ұсыныс сақталды",
    );
    await expect(page).toHaveURL(new RegExp(`/advertisements/${ad.id}$`));
    const proposals = page.getByLabel(
      locale === "ru" ? "Ручные предложения" : "Қолмен енгізілген ұсыныстар",
      { exact: true },
    );
    await expect(proposals).toContainText(proposer.display_name);
    expect(await proposals.locator("blockquote").textContent()).toBe(quote);
    await expect(proposals.getByRole("button")).toHaveCount(0);
    await expect(proposals.getByRole("link")).toHaveAttribute(
      "href",
      `/review?advertisement_id=${ad.id}`,
    );
    expect(commands).toHaveLength(1);
    expect(commands[0].body.quote).toBe(quote);
    expect(commands[0].path).toBe(
      `/api/v1/extractions/${extraction.id}/manual-annotations`,
    );
  });

  test(`SQ04 advertisement detail keeps proposal provenance read only for viewers in ${locale}`, async ({
    page,
  }) => {
    const { form, commands } = await mount(page, {
      view: "advertisement",
      locale,
      actor: { ...reviewer, role: "viewer" },
      pending: true,
    });
    const proposals = page.getByLabel(
      locale === "ru" ? "Ручные предложения" : "Қолмен енгізілген ұсыныстар",
      { exact: true },
    );
    await expect(proposals).toContainText(proposer.display_name);
    expect(await proposals.locator("blockquote").textContent()).toBe(quote);
    await expect(form).toHaveCount(0);
    await expect(proposals.getByRole("button")).toHaveCount(0);
    expect(commands).toEqual([]);
  });
}

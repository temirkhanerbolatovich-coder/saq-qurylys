import { expect, test, type Page as BrowserPage } from "@playwright/test";
import type {
  Advertisement,
  AdvertisementReviewPage,
  Extraction,
  PropertyDetail,
} from "../lib/types";
import { login, testOrigin } from "./support";

const target = new URL(testOrigin);
test.skip(
  process.env.SAQ_ISOLATED_ACCEPTANCE !== "1" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname),
  "Real mutations require an explicitly isolated loopback acceptance runtime.",
);

async function post(page: BrowserPage, path: string, data: unknown) {
  const csrf = await (await page.request.get("/api/v1/auth/csrf")).json();
  return page.request.post(`/api/v1${path}`, {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf.csrf_token,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data,
  });
}

async function analyzedMaterial(
  page: BrowserPage,
  label: string,
  text: string,
) {
  const saved = await post(page, "/advertisements", {
    text,
    source_label: label,
    is_demo: true,
  });
  expect(saved.status()).toBe(201);
  const ad: Advertisement = await saved.json();
  await page.goto(`/review?advertisement_id=${ad.id}`);
  await page
    .getByRole("button", { name: "Запустить анализ", exact: true })
    .click();
  await expect
    .poll(
      async () => {
        const response = await page.request.get(
          `/api/v1/advertisements/${ad.id}`,
        );
        return (await response.json()).status;
      },
      { timeout: 30_000 },
    )
    .toBe("READY_FOR_REVIEW");
  const extractions: Extraction[] = await (
    await page.request.get(`/api/v1/advertisements/${ad.id}/extractions`)
  ).json();
  expect(extractions.length).toBeGreaterThan(0);
  expect(
    extractions[0].hypotheses.some((row) => row.field === "PAYMENT_TERM"),
  ).toBe(true);
  return { ad, extraction: extractions[0] };
}

test("real analysis and explicit hypothesis reviews remove only the resolved action from the derived queue", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  const source = `DEMO queue acceptance ${crypto.randomUUID()}`;
  const text = "DEMO. ЖК «Ертіс», очередь 1.\nПервоначальный взнос 20%.";
  const { ad, extraction } = await analyzedMaterial(page, source, text);
  const filters = new URLSearchParams({
    is_demo: "true",
    action: "REVIEW_HYPOTHESES",
    from: ad.captured_at,
    page_size: "20",
  });
  const pending = (await (
    await page.request.get(`/api/v1/advertisements/review-queue?${filters}`)
  ).json()) as AdvertisementReviewPage;
  const work = pending.items.find((row) => row.advertisement_id === ad.id);
  expect(work?.extraction_id).toBe(extraction.id);
  expect(work?.pending_hypothesis_ids.length).toBe(
    extraction.hypotheses.length,
  );
  await page.goto(`/review?queue=actions&${filters}`);
  const queue = page.getByRole("region", {
    name: "Нерешённые действия материалов",
    exact: true,
  });
  await expect(queue).toContainText(
    `Материалов с нерешёнными действиями: ${pending.total}`,
  );
  const material = queue
    .locator(".review-queue-list > li")
    .filter({ has: page.getByRole("link", { name: new RegExp(source) }) });
  await material
    .getByRole("link", { name: /^Проверить гипотезы · осталось/ })
    .click();
  await expect(page.locator(`[id="review-hypotheses-${ad.id}"]`)).toBeFocused();
  await expect(page.getByLabel("Версия текста", { exact: true })).toHaveValue(
    extraction.id,
  );
  for (const hypothesis of extraction.hypotheses) {
    const card = page.locator(`[id="hypothesis-${hypothesis.id}"]`);
    await card
      .getByLabel("Обоснование проверки", { exact: true })
      .fill("DEMO приёмка: фрагмент сверён с новым оригинальным текстом");
    await card
      .getByRole("button", { name: "Подтвердить гипотезу", exact: true })
      .click();
    await expect(card.locator(".status")).toHaveText("Подтверждено");
  }
  const remaining = (await (
    await page.request.get(`/api/v1/advertisements/review-queue?${filters}`)
  ).json()) as AdvertisementReviewPage;
  expect(remaining.items.some((row) => row.advertisement_id === ad.id)).toBe(
    false,
  );
  await expect(queue).toContainText(
    `Материалов с нерешёнными действиями: ${remaining.total}`,
  );
  const all = (await (
    await page.request.get(
      `/api/v1/advertisements/review-queue?is_demo=true&from=${encodeURIComponent(ad.captured_at)}`,
    )
  ).json()) as AdvertisementReviewPage;
  expect(
    all.items.find((row) => row.advertisement_id === ad.id)?.actions,
  ).toContain("REVIEW_MATCH");
  const unchanged: Advertisement = await (
    await page.request.get(`/api/v1/advertisements/${ad.id}`)
  ).json();
  expect(unchanged.original_text).toBe(text);
  expect(unchanged.status).toBe("READY_FOR_REVIEW");
  expect(unchanged.confirmed_property_id).toBeNull();
  expect(unchanged.is_demo).toBe(true);
  const original = unchanged.assets.find((asset) => asset.kind === "TEXT");
  expect(original).toBeTruthy();
  expect(
    await (await page.request.get(`/api/v1/assets/${original!.id}`)).text(),
  ).toBe(text);
});

test("real reassignment retains historical pending R2 and the exact inline rejection closes that old task", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  const registry = await (
    await page.request.get("/api/v1/properties?is_demo=true&page_size=100")
  ).json();
  const properties: PropertyDetail[] = [];
  for (const row of registry.items) {
    properties.push(
      await (await page.request.get(`/api/v1/properties/${row.id}`)).json(),
    );
  }
  const old =
    properties.find(
      (row) =>
        row.property.name.includes("Нұрлы") &&
        !row.factors.some((factor) => factor.code === "R2"),
    ) ||
    properties.find(
      (row) => !row.factors.some((factor) => factor.code === "R2"),
    );
  expect(
    old,
    "An isolated DEMO property without R2 is required; do not overwrite an existing factor.",
  ).toBeTruthy();
  const next = properties.find((row) => row.property.id !== old!.property.id)!;
  const source = `DEMO historical queue acceptance ${crypto.randomUUID()}`;
  const { ad, extraction: initial } = await analyzedMaterial(
    page,
    source,
    "DEMO. Первоначальный взнос 20%.",
  );
  const payment = initial.hypotheses.find(
    (row) => row.field === "PAYMENT_TERM",
  )!;
  let extraction = initial;
  for (const hypothesis of initial.hypotheses) {
    const reviewed = await post(page, `/extractions/${initial.id}/review`, {
      expected_revision: extraction.revision,
      hypothesis_id: hypothesis.id,
      action: "CONFIRM",
      reason: "DEMO historical setup: original checked",
    });
    expect(reviewed.status()).toBe(200);
    extraction = await reviewed.json();
  }
  const currentMaterial: Advertisement = await (
    await page.request.get(`/api/v1/advertisements/${ad.id}`)
  ).json();
  const matched = await post(page, `/advertisements/${ad.id}/matches`, {
    property_id: old!.property.id,
    expected_advertisement_revision: currentMaterial.revision,
    action: "CONFIRM",
    reason: "DEMO historical setup: explicitly selected old object",
  });
  expect(matched.status()).toBe(200);
  const linked: Advertisement = await matched.json();
  const evidenceResponse = await post(page, "/evidence", {
    property_id: old!.property.id,
    kind: "ADVERTISEMENT_FRAGMENT",
    asset_id: payment.fragment.asset_id,
    advertisement_id: ad.id,
    extraction_id: extraction.id,
    hypothesis_id: payment.id,
    fragment: payment.fragment,
    description: "DEMO original payment evidence for historical target",
    source_label: source,
    event_at: null,
    is_demo: true,
  });
  expect(evidenceResponse.status()).toBe(201);
  const evidence = await evidenceResponse.json();
  const pending = await post(
    page,
    `/properties/${old!.property.id}/risk-factors`,
    {
      code: "R2",
      as_of: new Date().toISOString(),
      evidence_ids: [evidence.id],
      reason: "DEMO historical setup: create pending only",
    },
  );
  expect(pending.status()).toBe(201);
  const factor = (await pending.json()).factor;
  const moved = await post(page, `/advertisements/${ad.id}/matches`, {
    property_id: next.property.id,
    expected_advertisement_revision: linked.revision,
    action: "CONFIRM",
    reason:
      "DEMO historical setup: reassign source; old R2 needs its own decision",
  });
  expect(moved.status()).toBe(200);
  const filters = new URLSearchParams({
    is_demo: "true",
    action: "REVIEW_R2",
    from: ad.captured_at,
  });
  const before = (await (
    await page.request.get(`/api/v1/advertisements/review-queue?${filters}`)
  ).json()) as AdvertisementReviewPage;
  const work = before.items.find((row) => row.advertisement_id === ad.id)!;
  expect(work.r2_reviews).toEqual([
    {
      property_id: old!.property.id,
      property_name: old!.property.name,
      factor_id: factor.id,
      evidence_ids: [evidence.id],
    },
  ]);
  await page.goto(`/review?queue=actions&${filters}`);
  const queue = page.getByRole("region", {
    name: "Нерешённые действия материалов",
    exact: true,
  });
  await queue
    .locator("summary")
    .filter({
      hasText: `Проверить решение R2 по объекту ${old!.property.name}`,
    })
    .click();
  const form = page.getByLabel(`Решение R2: ${old!.property.name}`, {
    exact: true,
  });
  await expect(form).toContainText(
    "Исторический R2 относится к прежнему объекту",
  );
  await expect(form).toContainText(evidence.id);
  await form
    .getByLabel(`Обоснование решения R2 по объекту ${old!.property.name}`, {
      exact: true,
    })
    .fill(
      "DEMO: прежняя привязка заменена, исходное доказательство сохранено; исторический R2 отклонён отдельно",
    );
  const decision = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/risk-factors/${factor.id}/review`) &&
      response.request().method() === "POST",
  );
  await form
    .getByRole("button", { name: "Отклонить R2 этого объекта", exact: true })
    .click();
  expect((await decision).status()).toBe(200);
  await expect(
    queue.locator(".review-queue-list > li").filter({ hasText: source }),
  ).toHaveCount(0);
  const oldAfter: PropertyDetail = await (
    await page.request.get(`/api/v1/properties/${old!.property.id}`)
  ).json();
  const nextAfter: PropertyDetail = await (
    await page.request.get(`/api/v1/properties/${next.property.id}`)
  ).json();
  expect(oldAfter.factors.find((row) => row.id === factor.id)).toMatchObject({
    status: "REJECTED",
    evidence_ids: [evidence.id],
  });
  expect(oldAfter.factors.filter((row) => row.code !== "R2")).toEqual(
    old!.factors,
  );
  expect(nextAfter.factors).toEqual(next.factors);
  const retained: Advertisement = await (
    await page.request.get(`/api/v1/advertisements/${ad.id}`)
  ).json();
  expect(retained.confirmed_property_id).toBe(next.property.id);
  expect(retained.original_text).toBe(ad.original_text);
  expect(retained.is_demo).toBe(true);
});

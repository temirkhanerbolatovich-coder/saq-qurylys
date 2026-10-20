import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import type {
  Advertisement,
  Extraction,
  PropertyDetail,
  User,
} from "../lib/types";
import { login, testOrigin } from "./support";

test.skip(
  process.env.SAQ_ISOLATED_ACCEPTANCE !== "1" ||
    process.env.SAQ_SQ_MANUAL_LIVE !== "1" ||
    !process.env.SAQ_SQ_MANUAL_PROPERTY_ID ||
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(testOrigin).hostname,
    ) ||
    new URL(testOrigin).port !== "3092",
  "Requires explicit SQ04 isolated acceptance, a dedicated DEMO property and disposable database/storage/worker on local port 3092.",
);

async function post(page: Page, path: string, data: unknown) {
  const csrf = await (await page.request.get("/api/v1/auth/csrf")).json();
  return page.request.post(`/api/v1${path}`, {
    headers: {
      Origin: testOrigin,
      "X-CSRF-Token": csrf.csrf_token,
      "Idempotency-Key": randomUUID(),
    },
    data,
  });
}

async function uiCommand(
  page: Page,
  button: Locator,
  path: string,
  status: number,
) {
  const response = page.waitForResponse(
    (result) =>
      new URL(result.url()).pathname === `/api/v1${path}` &&
      result.request().method() === "POST",
  );
  await button.click();
  const result = await response;
  expect(result.status(), `${path}: ${await result.text()}`).toBe(status);
  return result;
}

test("SQ04 real manual proposal requires a second analyst before separate evidence and R2", async ({
  page,
}) => {
  test.setTimeout(150_000);
  page.on("dialog", (dialog) => dialog.accept());
  await login(page);
  const proposer: User = await (
    await page.request.get("/api/v1/auth/me")
  ).json();
  const propertyId = process.env.SAQ_SQ_MANUAL_PROPERTY_ID!;
  const readProperty = async (): Promise<PropertyDetail> =>
    (await page.request.get(`/api/v1/properties/${propertyId}`)).json();
  const before = await readProperty();
  expect(before.property.is_demo).toBe(true);
  expect(
    before.property.risk.score,
    "Requires untouched disposable score0 fixture; existing data must not be reset",
  ).toBe(0);
  expect(before.property.risk.unknown_codes).toContain("R1");
  const baselineRisk = {
    score: before.property.risk.score,
    zone: before.property.risk.zone,
    revision: before.property.risk.revision,
    rules_version: before.property.risk.rules_version,
    confirmed_codes: before.property.risk.confirmed_codes,
    unknown_codes: before.property.risk.unknown_codes,
  };
  const original =
    "DEMO ЖК Оқу. Оплатите первый этап 2 млн тенге сегодня, дом ещё строится.";
  const quote = "Оплатите первый этап 2 млн тенге сегодня";
  const created = await post(page, "/advertisements", {
    text: original,
    source_label: `DEMO SQ04 live ${Date.now()}`,
    is_demo: true,
  });
  expect(created.status()).toBe(201);
  const ad: Advertisement = await created.json();
  const sourceBytes = Buffer.from(original, "utf8");
  const sourceSha = createHash("sha256").update(sourceBytes).digest("hex");
  expect(ad.assets[0].sha256).toBe(sourceSha);
  await page.goto(`/review?advertisement_id=${ad.id}`);
  await uiCommand(
    page,
    page.getByRole("button", { name: "Запустить анализ", exact: true }),
    `/advertisements/${ad.id}/analyze`,
    202,
  );
  const readExtraction = async (): Promise<Extraction> =>
    (
      await (
        await page.request.get(`/api/v1/advertisements/${ad.id}/extractions`)
      ).json()
    )[0];
  await expect
    .poll(async () => !!(await readExtraction()), { timeout: 45_000 })
    .toBe(true);
  const extracted = await readExtraction();
  expect(
    extracted.hypotheses.some((item) => item.field === "PAYMENT_TERM"),
  ).toBe(false);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname.startsWith("/api/v1/")
    )
      writes.push(new URL(request.url()).pathname);
  });
  await page.goto(`/advertisements/${ad.id}`);
  const form = page.getByTestId("manual-annotation");
  await form.locator("summary").click();
  await expect(form.locator("textarea[readonly]")).toHaveValue(original);
  const start = Array.from(original.slice(0, original.indexOf(quote))).length;
  await form.locator('input[type="number"]').nth(0).fill(String(start));
  await form
    .locator('input[type="number"]')
    .nth(1)
    .fill(String(start + Array.from(quote).length));
  await form
    .locator("textarea:not([readonly])")
    .fill(
      "DEMO точная цитата пропущена правилами; направлена другому аналитику",
    );
  expect(await form.getByTestId("manual-annotation-quote").textContent()).toBe(
    quote,
  );
  expect(writes).toEqual([]);
  await uiCommand(
    page,
    form.locator('button[type="submit"]'),
    `/extractions/${extracted.id}/manual-annotations`,
    201,
  );
  await expect(form.getByRole("status")).toContainText("Предложение сохранено");
  const proposed = await readExtraction();
  const manual = proposed.hypotheses.find((item) => item.origin === "MANUAL")!;
  expect(manual.review_status).toBe("PENDING");
  expect(manual.fragment.quote).toBe(quote);
  expect(manual.proposed_by?.id).toBe(proposer.id);
  expect(manual.reviewed_by).toBeNull();
  const afterProposal = await readProperty();
  expect(afterProposal.property.risk).toMatchObject(baselineRisk);
  expect(afterProposal.factors).toEqual(before.factors);
  expect(writes).toEqual([
    `/api/v1/extractions/${extracted.id}/manual-annotations`,
  ]);
  await page.goto(`/review?advertisement_id=${ad.id}`);
  const card = page.locator(`#hypothesis-${manual.id}`);
  await card
    .getByLabel("Обоснование проверки")
    .fill("DEMO автор не может проверить собственное предложение");
  await expect(
    card.getByRole("button", { name: "Подтвердить гипотезу", exact: true }),
  ).toBeDisabled();
  await expect(card).toContainText("Требуется другой уполномоченный аналитик");
  const csrf = await (await page.request.get("/api/v1/auth/csrf")).json();
  const secondLogin = await page.request.post("/api/v1/auth/login", {
    headers: { Origin: testOrigin, "X-CSRF-Token": csrf.csrf_token },
    data: {
      username: process.env.SAQ_SQ_INDEPENDENT_USERNAME || "sq-independent",
      password: process.env.BOOTSTRAP_ANALYST_PASSWORD,
    },
  });
  expect(
    secondLogin.status(),
    "A separately provisioned disposable second analyst is required",
  ).toBe(200);
  await page.reload();
  const reviewer: User = await (
    await page.request.get("/api/v1/auth/me")
  ).json();
  expect(reviewer.role).toBe("analyst");
  expect(reviewer.id).not.toBe(proposer.id);
  await card
    .getByLabel("Обоснование проверки")
    .fill("DEMO независимая проверка точной цитаты по оригиналу");
  await uiCommand(
    page,
    card.getByRole("button", { name: "Подтвердить гипотезу", exact: true }),
    `/extractions/${extracted.id}/review`,
    200,
  );
  await expect(card).toContainText("принято независимым аналитиком");
  const confirmed = (await readExtraction()).hypotheses.find(
    (item) => item.id === manual.id,
  )!;
  expect(confirmed.reviewed_by?.id).toBe(reviewer.id);
  expect(confirmed.fragment.quote).toBe(quote);
  expect((await readProperty()).property.risk).toMatchObject(baselineRisk);
  expect(writes).not.toContain("/api/v1/evidence");
  await page
    .getByLabel("ЖК / очередь · можно выбрать вручную")
    .selectOption(propertyId);
  await page
    .getByLabel("Обоснование выбора / отклонения")
    .fill(
      "DEMO синтетический сценарий: вручную проверена связь с учебным объектом",
    );
  await uiCommand(
    page,
    page.getByRole("button", { name: "Подтвердить привязку", exact: true }),
    `/advertisements/${ad.id}/matches`,
    200,
  );
  const r2 = page.locator(`#review-factor-${ad.id}`);
  await r2.getByLabel("Проверенное условие оплаты").selectOption(manual.id);
  await r2
    .getByLabel("Обоснование решения по R2")
    .fill("DEMO независимо проверенная ручная цитата; отдельное решение R2");
  const evidence = await (
    await uiCommand(
      page,
      r2.getByRole("button", {
        name: "Сохранить доказательство R2",
        exact: true,
      }),
      "/evidence",
      201,
    )
  ).json();
  await expect(r2.getByRole("status")).toContainText(
    "Доказательство сохранено",
  );
  expect((await readProperty()).property.risk.score).toBe(0);
  expect(evidence.fragment.quote).toBe(quote);
  expect(evidence.date_basis).toBe("CAPTURE_ONLY");
  expect(evidence.published_at).toBeNull();
  const pending = (await readProperty()).factors.find(
    (item) => item.code === "R2",
  )!;
  await uiCommand(
    page,
    r2.getByRole("button", { name: "Подтвердить R2 · +25", exact: true }),
    `/risk-factors/${pending.id}/review`,
    200,
  );
  await expect(r2.locator(".zone strong")).toHaveText("25");
  const after = await readProperty();
  expect(after.property.risk.score).toBe(25);
  expect(after.property.risk.confirmed_codes).toEqual(["R2"]);
  expect(after.property.risk.unknown_codes).toContain("R1");
  const retained: Advertisement = await (
    await page.request.get(`/api/v1/advertisements/${ad.id}`)
  ).json();
  expect(retained.original_text).toBe(original);
  expect(retained.assets[0].sha256).toBe(sourceSha);
  expect(
    (await page.request.get(`/api/v1/assets/${retained.assets[0].id}`)).ok(),
  ).toBe(true);
  expect(
    (
      await (
        await page.request.get(`/api/v1/assets/${retained.assets[0].id}`)
      ).body()
    ).equals(sourceBytes),
  ).toBe(true);
});

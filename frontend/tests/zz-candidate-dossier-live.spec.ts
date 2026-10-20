import { expect, test, type Page } from "@playwright/test";
import type { Advertisement, PropertyDetail } from "../lib/types";
import type { MonitoringCandidate } from "../lib/monitoring-types";
import { login, testOrigin } from "./support";

test.skip(
  process.env.SAQ_ISOLATED_ACCEPTANCE !== "1" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(testOrigin).hostname),
  "Mutations require an explicitly isolated local DEMO runtime.",
);

async function post(page: Page, path: string, data: unknown) {
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

test("live DEMO candidate creates an unknown dossier and publication matching remains an explicit separate decision", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  const name = `DEMO Досье Ә ${crypto.randomUUID()}`;
  const source = `${name} — исходный материал`;
  const address = "DEMO ул. Учебная, 77";
  const created = await post(page, "/advertisements", {
    text: `${name}. Өскемен, ${address}. Очередь 1. Учебный материал.`,
    source_label: source,
    published_at: new Date(Date.now() - 3600_000).toISOString(),
    is_demo: true,
  });
  expect(created.status()).toBe(201);
  const ad: Advertisement = await created.json();
  const candidateResponse = await post(page, "/monitoring/candidates", {
    advertisement_id: ad.id,
    name,
    city: "Өскемен",
    address,
    phase: "очередь 1",
    reason: "DEMO название, адрес и очередь сверены с исходным текстом",
  });
  expect(candidateResponse.status()).toBe(201);
  const candidate: MonitoringCandidate = await candidateResponse.json();
  await page.goto(
    `/monitoring?candidate_id=${candidate.id}&section=candidates`,
  );
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/v1/"))
      writes.push(new URL(request.url()).pathname);
  });
  const disclosure = page.getByText("Создать досье объекта", { exact: true });
  await disclosure.focus();
  await disclosure.press("Enter");
  const form = page.getByRole("form", { name: "Создание досье из кандидата" });
  await expect(
    form.getByLabel("Название объекта и очередь", { exact: true }),
  ).toHaveValue(`${name} · очередь 1`);
  expect(writes).toEqual([]);
  await form
    .getByLabel("Название застройщика", { exact: true })
    .fill(`${name} застройщик`);
  await form
    .getByLabel("Основание создания досье", { exact: true })
    .fill("DEMO источники проверены, дубли не найдены");
  await page.reload();
  await page.getByText("Создать досье объекта", { exact: true }).click();
  await expect(form.getByRole("checkbox")).not.toBeChecked();
  await expect(
    form.getByLabel("Название застройщика", { exact: true }),
  ).toHaveValue(`${name} застройщик`);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await form.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/candidate-dossier-live-20261019/form-${width}.png`,
    });
  }
  await form.getByRole("checkbox").check();
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/candidates/${candidate.id}/dossier`) &&
      response.request().method() === "POST",
  );
  await form
    .getByRole("button", { name: "Создать новое досье", exact: true })
    .click();
  const saved = await savedResponse;
  expect(saved.status()).toBe(201);
  const updated: MonitoringCandidate = await saved.json();
  expect(updated.property_id).toBeTruthy();
  expect(writes).toEqual([
    `/api/v1/monitoring/candidates/${candidate.id}/dossier`,
  ]);
  const propertyId = updated.property_id!;
  const detail = async (): Promise<PropertyDetail> =>
    (await page.request.get(`/api/v1/properties/${propertyId}`)).json();
  const initial = await detail();
  expect(initial.source_candidate_id).toBe(candidate.id);
  expect(initial.property.legal_verification_status).toBe("UNKNOWN");
  expect(initial.property.stage).toBe("UNKNOWN");
  expect(initial.property.risk.confirmed_codes).toEqual([]);
  expect(initial.factors).toEqual([]);
  expect(initial.advertisement_ids).toEqual([]);
  const unbound: Advertisement = await (
    await page.request.get(`/api/v1/advertisements/${ad.id}`)
  ).json();
  expect(unbound.confirmed_property_id).toBeNull();
  expect(unbound.revision).toBe(ad.revision);

  await page
    .getByRole("link", { name: "Открыть созданное досье", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/properties/${propertyId}$`));
  const origin = page.getByRole("link", {
    name: "кандидата и его исходных материалов",
    exact: true,
  });
  await expect(origin).toHaveAttribute(
    "href",
    `/monitoring?candidate_id=${candidate.id}&section=candidates`,
  );
  await origin.click();
  await page.getByRole("link", { name: source, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/advertisements/${ad.id}$`));
  await page
    .getByRole("link", { name: "Открыть анализ и проверку", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Запустить анализ", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/v1/advertisements/${ad.id}`)
          ).json()
        ).status,
      { timeout: 30_000 },
    )
    .toBe("READY_FOR_REVIEW");
  const picker = page.getByRole("region", {
    name: "Поиск объекта для привязки",
    exact: true,
  });
  await picker
    .getByRole("searchbox", {
      name: "Найти ЖК, застройщика или БИН",
      exact: true,
    })
    .fill(name);
  await picker.getByRole("button", { name: "Найти ЖК", exact: true }).click();
  await picker.getByRole("combobox").selectOption(propertyId);
  expect((await detail()).advertisement_ids).toEqual([]);
  await page
    .getByLabel("Обоснование выбора / отклонения", { exact: true })
    .fill("DEMO идентичность и очередь проверены по оригиналу");
  await page
    .getByRole("button", { name: "Подтвердить привязку", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/v1/advertisements/${ad.id}`)
          ).json()
        ).confirmed_property_id,
    )
    .toBe(propertyId);
  const final = await detail();
  expect(final.advertisement_ids).toContain(ad.id);
  expect(final.property.legal_verification_status).toBe("UNKNOWN");
  expect(final.property.risk.confirmed_codes).toEqual([]);
  expect(final.factors).toEqual([]);
  expect(writes.filter((path) => path.endsWith("/dossier"))).toHaveLength(1);
  await page.goto(`/properties/${propertyId}`);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/candidate-dossier-live-20261019/dossier-${width}.png`,
    });
  }
});

test("live DEMO candidate corrects a dossier link through separate audited decisions", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  const name = `DEMO Связь Ә ${crypto.randomUUID()}`;
  const savedAd = await post(page, "/advertisements", {
    text: `${name}. DEMO адрес 99, очередь 1.`,
    source_label: name,
    is_demo: true,
  });
  expect(savedAd.status()).toBe(201);
  const ad: Advertisement = await savedAd.json();
  const identity = {
    advertisement_id: ad.id,
    name,
    city: "Өскемен",
    address: "DEMO адрес 99",
    phase: "1",
    reason: "DEMO проверка исходного материала",
  };
  const originResponse = await post(page, "/monitoring/candidates", identity);
  expect(originResponse.status()).toBe(201);
  const origin: MonitoringCandidate = await originResponse.json();
  const dossierResponse = await post(
    page,
    `/monitoring/candidates/${origin.id}/dossier`,
    {
      expected_revision: origin.revision,
      name,
      address: identity.address,
      developer_name: `${name} застройщик`,
      identity_checked: true,
      reason: "DEMO создание отдельного учебного объекта",
    },
  );
  expect(dossierResponse.status()).toBe(201);
  const propertyId = (await dossierResponse.json()).property_id;
  const correctName = `${name} правильный объект`;
  const correctOriginResponse = await post(page, "/monitoring/candidates", {
    ...identity,
    name: correctName,
  });
  expect(correctOriginResponse.status()).toBe(201);
  const correctOrigin: MonitoringCandidate = await correctOriginResponse.json();
  const correctDossier = await post(
    page,
    `/monitoring/candidates/${correctOrigin.id}/dossier`,
    {
      expected_revision: correctOrigin.revision,
      name: correctName,
      address: identity.address,
      developer_name: `${name} застройщик`,
      identity_checked: true,
      reason: "DEMO правильное досье для проверки коррекции",
    },
  );
  expect(correctDossier.status()).toBe(201);
  const correctPropertyId = (await correctDossier.json()).property_id;
  const detail = async (): Promise<PropertyDetail> =>
    (await page.request.get(`/api/v1/properties/${propertyId}`)).json();
  const before = await detail();
  const nextResponse = await post(page, "/monitoring/candidates", {
    ...identity,
    name: `${name} новое наблюдение`,
  });
  expect(nextResponse.status()).toBe(201);
  const next: MonitoringCandidate = await nextResponse.json();
  await page.goto(`/monitoring?candidate_id=${next.id}&section=candidates`);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/v1/"))
      writes.push(new URL(request.url()).pathname);
  });
  const disclosure = page.getByText("Связать с существующим досье", {
    exact: true,
  });
  await disclosure.focus();
  await disclosure.press("Enter");
  const picker = page.getByRole("region", {
    name: "Поиск объекта для привязки",
    exact: true,
  });
  await picker
    .getByRole("searchbox", {
      name: "Найти ЖК, застройщика или БИН",
      exact: true,
    })
    .fill(name);
  await picker.getByRole("button", { name: "Найти ЖК", exact: true }).click();
  await picker.getByRole("combobox").selectOption(propertyId);
  const form = page.getByRole("form", { name: "Связь кандидата с досье" });
  await form
    .getByLabel("Основание связи с досье", { exact: true })
    .fill("DEMO исходник, адрес и очередь сопоставлены вручную");
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await form.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/candidate-link-live-20261019/form-${width}.png`,
    });
  }
  expect(writes).toEqual([]);
  await form.getByRole("checkbox").check();
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/candidates/${next.id}/link-dossier`) &&
      response.request().method() === "POST",
  );
  await form
    .getByRole("button", { name: "Подтвердить связь с досье", exact: true })
    .click();
  const response = await savedResponse;
  expect(response.status()).toBe(200);
  expect((await response.json()).property_link_kind).toBe("LINKED");
  await page
    .getByRole("link", { name: "Открыть связанное досье", exact: true })
    .click();
  const after = await detail();
  expect(after.source_candidate_id).toBe(origin.id);
  expect(after.linked_candidate_count).toBe(1);
  expect(after.property.revision).toBe(before.property.revision);
  expect(after.factors).toEqual(before.factors);
  expect(after.advertisement_ids).toEqual([]);
  expect(
    (await (await page.request.get(`/api/v1/advertisements/${ad.id}`)).json())
      .confirmed_property_id,
  ).toBeNull();
  await expect(
    page.getByRole("link", {
      name: "кандидата и его исходных материалов",
      exact: true,
    }),
  ).toHaveAttribute(
    "href",
    `/monitoring?candidate_id=${origin.id}&section=candidates`,
  );
  await page
    .getByRole("link", { name: "Связанные кандидаты: 1", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`property_id=${propertyId}`));
  await expect(
    page.getByText("Найдено кандидатов: 2", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: next.name, exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([
    `/api/v1/monitoring/candidates/${next.id}/link-dossier`,
  ]);
  await page.getByRole("link", { name: next.name, exact: true }).click();
  const unlinkDisclosure = page.getByText("Исправить ошибочную связь", {
    exact: true,
  });
  await unlinkDisclosure.focus();
  await unlinkDisclosure.press("Enter");
  const unlinkForm = page.getByRole("form", {
    name: "Отмена ошибочной связи с досье",
  });
  const correctionReason =
    "DEMO уточнена очередь: отмена ошибочной идентификации";
  await unlinkForm
    .getByRole("textbox", { name: "Причина отмены связи", exact: true })
    .fill(correctionReason);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await unlinkForm.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/candidate-unlink-live-20261019/form-${width}.png`,
    });
  }
  expect(writes).toHaveLength(1);
  await unlinkForm.getByRole("checkbox").check();
  const unlinkedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/candidates/${next.id}/unlink-dossier`) &&
      response.request().method() === "POST",
  );
  await unlinkForm
    .getByRole("button", { name: "Отменить ошибочную связь", exact: true })
    .click();
  const unlinked = await unlinkedResponse;
  expect(unlinked.status()).toBe(200);
  expect((await unlinked.json()).property_id).toBeNull();
  await expect(disclosure).toBeVisible();
  const cancelled = await detail();
  expect(cancelled.source_candidate_id).toBe(origin.id);
  expect(cancelled.linked_candidate_count).toBe(0);
  expect(cancelled.property.revision).toBe(before.property.revision);
  expect(cancelled.advertisement_ids).toEqual([]);
  await disclosure.click();
  await picker
    .getByRole("searchbox", {
      name: "Найти ЖК, застройщика или БИН",
      exact: true,
    })
    .fill(correctName);
  await picker.getByRole("button", { name: "Найти ЖК", exact: true }).click();
  await picker.getByRole("combobox").selectOption(correctPropertyId);
  await form
    .getByRole("textbox", { name: "Основание связи с досье", exact: true })
    .fill("DEMO подтверждён правильный объект по источнику");
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Подтвердить связь с досье", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Открыть связанное досье", exact: true }),
  ).toHaveAttribute("href", `/properties/${correctPropertyId}`);
  const history = page
    .getByText("История связей с досье", { exact: true })
    .locator("..");
  if ((await history.getAttribute("open")) === null)
    await history.locator(":scope > summary").click();
  await expect(
    history.getByText(correctionReason, { exact: true }),
  ).toBeVisible();
  await expect(
    history.getByText("Отменена ошибочная связь кандидата", { exact: true }),
  ).toBeVisible();
  await expect(
    history.getByText("Кандидат связан с досье", { exact: true }),
  ).toHaveCount(2);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await history.locator(":scope > summary").scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `../output/qa/candidate-unlink-live-20261019/history-${width}.png`,
    });
  }
  expect(
    (await (await page.request.get(`/api/v1/advertisements/${ad.id}`)).json())
      .confirmed_property_id,
  ).toBeNull();
  const corrected: PropertyDetail = await (
    await page.request.get(`/api/v1/properties/${correctPropertyId}`)
  ).json();
  expect(corrected.source_candidate_id).toBe(correctOrigin.id);
  expect(corrected.linked_candidate_count).toBe(1);
  expect(corrected.factors).toEqual([]);
  expect(writes).toEqual([
    `/api/v1/monitoring/candidates/${next.id}/link-dossier`,
    `/api/v1/monitoring/candidates/${next.id}/unlink-dossier`,
    `/api/v1/monitoring/candidates/${next.id}/link-dossier`,
  ]);
});

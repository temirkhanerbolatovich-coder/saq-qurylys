import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MonitoringCandidate } from "../lib/monitoring-types";
import type {
  Advertisement,
  Extraction,
  PropertyDetail,
  Signal,
  SignalDetail,
} from "../lib/types";
import { login, testOrigin } from "./support";

test.skip(
  process.env.SAQ_V2_UI_LIVE !== "1" || new URL(testOrigin).port !== "3090",
  "Requires an explicitly disposable QA database and synthetic DEMO findings.",
);
async function uiCommand(page: Page, control: Locator, endpoint: string) {
  const saved = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === `/api/v1${endpoint}` &&
      r.request().method() === "POST",
  );
  await control.click();
  const response = await saved;
  expect(response.ok(), `${endpoint}: ${await response.text()}`).toBe(true);
  return response;
}

test("DEMO V2 historical version imports through real API to human review and archived PDF", async ({
  page,
}) => {
  test.setTimeout(150_000);
  page.on("pageerror", (error) => {
    throw error;
  });
  const fixture = JSON.parse(
    await readFile(process.env.SAQ_V2_UI_FIXTURE!, "utf8"),
  );
  const artifactDir = path.resolve("../.local/v2-ui-20261020/journey");
  await mkdir(artifactDir, { recursive: true });
  await login(page);
  const originalText = fixture.versions[0].text;
  const originalBytes = Buffer.from(originalText, "utf8");
  const originalSha = createHash("sha256").update(originalBytes).digest("hex");
  const paymentText = "Оплатите бронь 500 000 тенге до ввода.";
  const name = `DEMO Ертіс V2 QA ${Date.now()}`;
  const address = "DEMO участок Parser V2";
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/v1/"))
      writes.push(new URL(request.url()).pathname);
  });
  await page.goto(
    `/monitoring?section=v2&q=retained-v2&v2_finding_id=${fixture.finding_id}&v2_finding_version=1`,
  );
  const selected = page.getByRole("region", {
    name: "Выбранная находка V2",
    exact: true,
  });
  await expect(selected).toContainText(originalText);
  await expect(selected.getByText("DEMO", { exact: true })).toBeVisible();
  await selected
    .getByLabel("Наблюдение для импорта")
    .selectOption(fixture.versions[0].observation_id);
  await selected
    .getByLabel("Причина импорта находки")
    .fill("DEMO сверена точная историческая версия; видео не проверено");
  await selected.getByRole("checkbox").check();
  expect(writes).toEqual([]);
  const receipt = await (
    await uiCommand(
      page,
      selected.getByRole("button", {
        name: "Импортировать текст этой версии",
        exact: true,
      }),
      `/monitoring/findings/${fixture.finding_id}/imports`,
    )
  ).json();
  const adId = receipt.advertisement_id;
  await expect(
    selected.getByRole("link", { name: "Продолжить проверку материала" }),
  ).toHaveAttribute("href", `/advertisements/${adId}`);
  const ad: Advertisement = await (
    await page.request.get(`/api/v1/advertisements/${adId}`)
  ).json();
  expect(ad.is_demo).toBe(true);
  expect(ad.status).toBe("NEW");
  expect(ad.original_text).toBe(originalText);
  expect(ad.confirmed_property_id).toBeNull();
  expect(ad.assets[0].sha256).toBe(originalSha);
  expect(
    await (
      await page.request.get(`/api/v1/advertisements/${ad.id}/extractions`)
    ).json(),
  ).toEqual([]);
  expect(
    (
      await (await page.request.get(`/api/v1/assets/${ad.assets[0].id}`)).body()
    ).equals(originalBytes),
  ).toBe(true);
  expect(
    (
      await (
        await page.request.get(
          `/api/v1/monitoring/findings/${fixture.finding_id}?version=2`,
        )
      ).json()
    ).text,
  ).toBe(fixture.versions[1].text);
  expect(writes).toEqual([
    `/api/v1/monitoring/findings/${fixture.finding_id}/imports`,
  ]);
  writes.length = 0;
  await page.goto(`/advertisements/${ad.id}`);
  await expect(page.locator(".original-text")).toContainText(paymentText);
  await page
    .getByRole("link", { name: "Сверить объект с реестром", exact: true })
    .click();
  await page
    .getByText("Добавить кандидата из публикации", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Проверить публикацию", exact: true })
    .click();
  await expect(page.locator(".monitoring-preview")).toContainText(
    ad.source_label,
  );
  await page.getByLabel("Название кандидата", { exact: true }).fill(name);
  await page.getByLabel("Город кандидата", { exact: true }).fill("Өскемен");
  await page
    .getByLabel("Адрес кандидата (если известен)", { exact: true })
    .fill(address);
  await page
    .getByLabel("Очередь / корпус кандидата (если известны)", { exact: true })
    .fill("очередь 1");
  await page
    .getByRole("textbox", {
      name: "Обоснование выделения объекта",
      exact: true,
    })
    .fill("DEMO название, адрес и очередь проверены в оригинальном материале");
  expect(writes).toEqual([]);
  const candidate: MonitoringCandidate = await (
    await uiCommand(
      page,
      page.getByRole("button", { name: "Сохранить кандидата", exact: true }),
      "/monitoring/candidates",
    )
  ).json();
  await expect(page).toHaveURL(new RegExp(`candidate_id=${candidate.id}`));
  expect(candidate.property_id).toBeNull();

  await page.getByText("Создать досье объекта", { exact: true }).click();
  const dossierForm = page.getByRole("form", {
    name: "Создание досье из кандидата",
    exact: true,
  });
  await dossierForm
    .getByRole("textbox", { name: "Название застройщика", exact: true })
    .fill(`${name} застройщик`);
  await dossierForm
    .getByRole("textbox", { name: "Основание создания досье", exact: true })
    .fill("DEMO проверены первоисточник, очередь и отсутствие дубля");
  await dossierForm.getByRole("checkbox").check();
  expect(writes).toHaveLength(1);
  const created: MonitoringCandidate = await (
    await uiCommand(
      page,
      dossierForm.getByRole("button", {
        name: "Создать новое досье",
        exact: true,
      }),
      `/monitoring/candidates/${candidate.id}/dossier`,
    )
  ).json();
  const propertyId = created.property_id!;
  expect(propertyId).toBeTruthy();
  const detail = async (): Promise<PropertyDetail> =>
    (await page.request.get(`/api/v1/properties/${propertyId}`)).json();
  const initial = await detail();
  expect(initial.source_candidate_id).toBe(candidate.id);
  expect(initial.property.legal_verification_status).toBe("UNKNOWN");
  expect(initial.property.stage).toBe("UNKNOWN");
  expect(initial.property.risk.score).toBe(0);
  expect(initial.property.risk.confirmed_codes).toEqual([]);
  expect(initial.factors).toEqual([]);
  expect(initial.advertisement_ids).toEqual([]);

  await page.getByRole("link", { name: ad.source_label, exact: true }).click();
  await page
    .getByRole("link", { name: "Открыть анализ и проверку", exact: true })
    .click();
  await uiCommand(
    page,
    page.getByRole("button", { name: "Запустить анализ", exact: true }),
    `/advertisements/${ad.id}/analyze`,
  );
  const payment = page
    .locator(".hypothesis")
    .filter({ hasText: "Условие оплаты" });
  await expect(payment).toHaveCount(1, { timeout: 30_000 });
  await expect(payment.locator(".status")).toHaveText("На проверке");
  expect((await detail()).property.risk.score).toBe(0);
  const picker = page.getByRole("region", {
    name: "Поиск объекта для привязки",
    exact: true,
  });
  await picker.getByRole("searchbox").fill(name);
  await picker.getByRole("button", { name: "Найти ЖК", exact: true }).click();
  await picker.getByRole("combobox").selectOption(propertyId);
  await page
    .getByLabel("Обоснование выбора / отклонения", { exact: true })
    .fill("DEMO адрес и очередь сопоставлены вручную с исходным материалом");
  await uiCommand(
    page,
    page.getByRole("button", { name: "Подтвердить привязку", exact: true }),
    `/advertisements/${ad.id}/matches`,
  );
  expect((await detail()).advertisement_ids).toEqual([ad.id]);
  expect((await detail()).property.risk.score).toBe(0);
  const extractions: Extraction[] = await (
    await page.request.get(`/api/v1/advertisements/${ad.id}/extractions`)
  ).json();
  const extraction = extractions[0];
  const hypothesis = extraction.hypotheses.find(
    (row) => row.field === "PAYMENT_TERM",
  )!;
  expect(hypothesis.review_status).toBe("PENDING");
  await payment.getByRole("button", { name: /показать в оригинале/ }).click();
  await expect(page.locator("mark")).toContainText(paymentText.slice(0, -1));
  await payment
    .getByLabel("Обоснование проверки", { exact: true })
    .fill("DEMO сумма и прямое предложение оплаты сверены с оригиналом");
  await uiCommand(
    page,
    payment.getByRole("button", { name: "Подтвердить гипотезу", exact: true }),
    `/extractions/${extraction.id}/review`,
  );
  await expect(payment.locator(".status")).toHaveText("Подтверждено");
  expect((await detail()).property.risk.score).toBe(0);

  await page
    .getByLabel("Проверенное условие оплаты")
    .selectOption(hypothesis.id);
  await page
    .getByLabel("Обоснование решения по R2", { exact: true })
    .fill("DEMO проверено прямое предложение перевода 500000 тенге");
  await uiCommand(
    page,
    page.getByRole("button", {
      name: "Сохранить доказательство R2",
      exact: true,
    }),
    "/evidence",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Доказательство сохранено" }),
  ).toBeVisible();
  const pending = await detail();
  expect(pending.factors).toHaveLength(1);
  const factor = pending.factors[0];
  expect(factor.code).toBe("R2");
  expect(factor.status).toBe("PENDING");
  expect(factor.evidence_ids).toHaveLength(1);
  expect(pending.property.risk.score).toBe(0);
  await uiCommand(
    page,
    page.getByRole("button", { name: "Подтвердить R2 · +25", exact: true }),
    `/risk-factors/${factor.id}/review`,
  );
  const confirmed = await detail();
  expect(confirmed.property.risk.score).toBe(25);
  expect(confirmed.property.risk.confirmed_codes).toEqual(["R2"]);
  expect(confirmed.property.legal_verification_status).toBe("UNKNOWN");

  await page.goto(`/properties/${propertyId}`);
  await page
    .getByRole("tab", { name: "Сигналы и отчёты", exact: true })
    .click();
  const draft: Signal = await (
    await uiCommand(
      page,
      page.getByRole("button", {
        name: "Создать черновик сигнала",
        exact: true,
      }),
      "/signals",
    )
  ).json();
  expect(draft.state).toBe("DRAFT");
  expect(draft.pdf_state).toBe("NOT_REQUESTED");
  expect(draft.risk_snapshot.score).toBe(25);
  await expect(page).toHaveURL(new RegExp(`signal_id=${draft.id}`));
  const signalPanel = page.getByTestId("signal-detail");
  await signalPanel
    .getByLabel("Обоснование решения по сигналу", { exact: true })
    .fill(
      "DEMO подтверждён только R2; основание UNKNOWN требует отдельной проверки",
    );
  await uiCommand(
    page,
    signalPanel.getByRole("button", {
      name: "Подтвердить сигнал",
      exact: true,
    }),
    `/signals/${draft.id}/decision`,
  );
  const signalDetail = async (): Promise<SignalDetail> =>
    (await page.request.get(`/api/v1/signals/${draft.id}`)).json();
  await expect
    .poll(async () => (await signalDetail()).signal.pdf_state, {
      timeout: 60_000,
    })
    .toBe("READY");
  const final = await signalDetail();
  expect(final.signal.state).toBe("CONFIRMED");
  expect(final.decisions).toHaveLength(1);
  expect(final.decisions[0].action).toBe("CONFIRM");
  expect(final.signal.risk_snapshot.confirmed_codes).toEqual(["R2"]);
  expect(final.snapshot.property.legal_verification_status).toBe("UNKNOWN");
  expect(
    final.snapshot.assets.find((asset) => asset.id === ad.assets[0].id)?.sha256,
  ).toBe(originalSha);
  expect(final.snapshot.evidence).toHaveLength(1);
  expect(final.snapshot.evidence[0].advertisement_id).toBe(ad.id);

  const pdfLink = signalPanel.getByRole("link", {
    name: "Скачать PDF этой версии",
    exact: true,
  });
  await expect(pdfLink).toBeVisible({ timeout: 15_000 });
  const downloadEvent = page.waitForEvent("download");
  await pdfLink.click();
  const download = await downloadEvent;
  expect(await download.failure()).toBeNull();
  const pdfPath = path.join(artifactDir, "signal-archived.pdf");
  await download.saveAs(pdfPath);
  const pdf = await readFile(pdfPath);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(1000);
  const persistedOriginal = await page.request.get(
    `/api/v1/assets/${ad.assets[0].id}`,
  );
  expect((await persistedOriginal.body()).equals(originalBytes)).toBe(true);
  expect(
    (await (await page.request.get(`/api/v1/advertisements/${ad.id}`)).json())
      .original_text,
  ).toBe(originalText);

  await writeFile(
    path.join(artifactDir, "result.json"),
    JSON.stringify(
      {
        finding_id: fixture.finding_id,
        imported_version: 1,
        advertisement_id: ad.id,
        property_id: propertyId,
        signal_id: draft.id,
        sha256: originalSha,
        source: "SYNTHETIC_DEMO_QA_FIXTURE",
        external_search: "NOT_RUN",
        score: 25,
        legal_status: "UNKNOWN",
      },
      null,
      2,
    ),
  );
});

test("V2 actual QA pages preserve RU/KZ layout and keyboard navigation without commands", async ({
  page,
}) => {
  test.setTimeout(90_000);
  page.on("pageerror", (error) => {
    throw error;
  });
  const fixture = JSON.parse(
    await readFile(process.env.SAQ_V2_UI_FIXTURE!, "utf8"),
  );
  const artifactDir = path.resolve("../.local/v2-ui-20261020/visual");
  await mkdir(artifactDir, { recursive: true });
  await login(page);
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") writes.push(r.url());
  });
  await page.goto(
    `/monitoring?section=v2&q=retained-v2&v2_profile_id=${fixture.profile_id}&v2_finding_id=${fixture.finding_id}&v2_finding_version=2`,
  );
  await expect(
    page.locator(".v2-original").filter({ hasText: fixture.versions[1].text }),
  ).toBeVisible();
  const samples: unknown[] = [];
  for (const locale of ["ru", "kk"]) {
    await page.locator(".shell-locale select").selectOption(locale);
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("#monitoring-panel-v2")).toBeVisible();
      const summary = page
        .locator("#monitoring-panel-v2 > section > details > summary")
        .first();
      await summary.focus();
      await summary.press("Enter");
      const dictionary = page
        .locator("#monitoring-panel-v2 > section > details")
        .first();
      await expect(dictionary).toHaveAttribute("open", "");
      await summary.press("Tab");
      expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
        "BUTTON",
      );
      const keyboard = await page.evaluate(() => {
        const rect = document.activeElement!.getBoundingClientRect();
        const style = getComputedStyle(document.activeElement!);
        return {
          top: rect.top,
          bottom: rect.bottom,
          outline: style.outlineStyle,
        };
      });
      expect(keyboard.top).toBeGreaterThanOrEqual(0);
      expect(keyboard.bottom).toBeLessThanOrEqual(900);
      expect(keyboard.outline).not.toBe("none");
      await summary.focus();
      await summary.press("Enter");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      const table = page.getByRole("region", {
        name:
          locale === "ru" ? "Таблица находок V2" : "V2 табылғандарының кестесі",
        exact: true,
      });
      await table.scrollIntoViewIfNeeded();
      await expect(table).toBeVisible();
      await page.screenshot({
        path: path.join(artifactDir, `${locale}-${width}-findings.png`),
      });
      await page
        .locator(".v2-original")
        .filter({ hasText: fixture.versions[1].text })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(artifactDir, `${locale}-${width}-version.png`),
      });
      samples.push({ locale, width, overflow, keyboard });
    }
  }
  expect(writes).toEqual([]);
  await writeFile(
    path.join(artifactDir, "measurements.json"),
    JSON.stringify(samples, null, 2),
  );
});
